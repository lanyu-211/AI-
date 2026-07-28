import { createApp, ref, computed, onMounted, onUnmounted, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

// 1. 自动注入 FontAwesome 依赖
if (!document.querySelector('link[href*="font-awesome"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
  document.head.appendChild(link);
}

// 自动注入 Tailwind CSS (由于组件使用了大量 Tailwind 类名)
if (!document.querySelector('script[src*="tailwindcss"]')) {
  const script = document.createElement('script');
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// 2. 辅助函数：获取元素的唯一 CSS Path，支持 Element Plus 动态 ID 过滤
const getCssPath = (el) => {
  if (!(el instanceof Element)) return '';
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    // 优先使用自定义强绑定属性作为唯一锚点，大幅提高 AI 页面重构及层级改变时的定位稳定性
    if (el.hasAttribute('data-pinmark') && el.getAttribute('data-pinmark')) {
      selector = `[data-pinmark="${CSS.escape(el.getAttribute('data-pinmark'))}"]`;
      path.unshift(selector);
      break;
    }
    if (selector === 'html' || selector === 'body') {
      path.unshift(selector);
    } else if (el.id && !el.id.startsWith('el-id-') && !/\d{4,}/.test(el.id)) {
      selector += '#' + CSS.escape(el.id);
      path.unshift(selector);
      break;
    } else {
      let nodeName = el.nodeName.toLowerCase();
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() === nodeName) nth++;
      }
      
      let attrExt = "";
      if (el.hasAttribute('aria-label') && el.getAttribute('aria-label')) {
        attrExt += `[aria-label="${CSS.escape(el.getAttribute('aria-label'))}"]`;
      }
      if (el.hasAttribute('role') && el.getAttribute('role')) {
        attrExt += `[role="${CSS.escape(el.getAttribute('role'))}"]`;
      }
      if (el.hasAttribute('name') && el.getAttribute('name')) {
        attrExt += `[name="${CSS.escape(el.getAttribute('name'))}"]`;
      }
      
      selector += attrExt + ":nth-of-type(" + nth + ")";
      path.unshift(selector);
    }
    el = el.parentNode;
  }
  return path.join(" > ");
};

// 3. 组件核心逻辑 (DOM元素绑定增强版)
const PinMarkComponent = {
  template: `
    <div>
      <!-- 悬浮操作区 (永远在屏幕右下角) -->
      <div class="fixed bottom-8 right-8 flex flex-col gap-4 pointer-events-none z-[9999]">
        <!-- 隐藏/显示全部按钮 -->
        <button 
          @click="toggleVisibility"
          class="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 pointer-events-auto border-4 border-white bg-gray-500 hover:bg-gray-600"
          :title="isHidden ? '显示所有批注' : '隐藏所有批注'">
          <i :class="isHidden ? 'fa-solid fa-eye-slash text-2xl' : 'fa-solid fa-eye text-2xl'"></i>
        </button>

        <!-- 主按钮 -->
        <button 
          @click="toggleMode"
          class="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 pointer-events-auto border-4 border-white"
          :class="isAnnotating ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/50'"
          title="切换批注模式">
          <i :class="isAnnotating ? 'fa-solid fa-xmark text-2xl' : 'fa-solid fa-thumbtack text-2xl'"></i>
        </button>
      </div>

      <!-- 批注模式的遮罩层 -->
      <div v-if="isAnnotating" 
           class="fixed inset-0 cursor-crosshair pointer-events-auto bg-blue-900/10 backdrop-blur-[1px] transition-all z-[9998]"
           @mousedown="handleCanvasClick">
        <div class="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl flex items-center pointer-events-none animate-bounce">
          <i class="fa-solid fa-thumbtack text-blue-400 mr-3"></i> 批注模式已开启：请点击页面任意位置添加批注图钉
        </div>
      </div>

      <!-- 所有的图钉 (DOM绑定渲染，解决弹窗/滚动问题) -->
      <div v-show="!isHidden" class="absolute left-0 top-0 w-full h-full pointer-events-none z-[9997]">
        <div v-for="(pin, index) in renderedPins" :key="pin.id" 
             v-show="pin.isVisible !== false"
             class="absolute group pointer-events-auto"
             :style="{ left: pin.renderedX + 'px', top: pin.renderedY + 'px' }">
          
          <div class="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 shadow-md flex items-center justify-center cursor-pointer text-white z-10 transition-transform hover:scale-110"
               :class="activePinId === pin.id ? 'bg-green-500 border-white scale-110 ring-4 ring-green-200' : 'bg-blue-500 border-white'"
               @click="togglePinContent(pin.id)">
            <span class="text-sm font-bold">{{ pin.displayIndex }}</span>
          </div>
        </div>
      </div>

      <!-- 可拖拽的悬浮批注面板 (固定在屏幕内拖拽) -->
      <div v-show="activePinData && !isHidden" id="annotator-panel"
           class="fixed bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] z-[9999] pointer-events-auto flex flex-col rounded-2xl border border-gray-100 overflow-hidden"
           :style="panelStyle">
        
        <div v-if="activePinData" class="flex-1 flex flex-col min-h-0">
          <!-- 面板头部 (拖拽把手) -->
          <div @mousedown="startDrag" class="h-11 border-b border-gray-100 flex items-center justify-between px-3 bg-gray-50/80 cursor-move select-none hover:bg-gray-100 transition-colors" title="按住拖动面板">
            <div class="flex items-center pointer-events-none">
              <i class="fa-solid fa-grip-vertical text-gray-400 mr-2"></i>
              <div class="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                {{ activePinData.displayIndex }}
              </div>
              <h3 class="font-semibold text-gray-700 text-sm">批注详情</h3>
            </div>
            <div class="flex space-x-1">
              <button @click.stop="deletePin(activePinData.pin.id)" class="w-7 h-7 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer" title="删除批注">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
              <button @click.stop="closePanel" class="w-7 h-7 rounded-md hover:bg-gray-200/60 text-gray-500 transition-colors flex items-center justify-center cursor-pointer" title="关闭面板">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          <!-- 面板内容区 -->
          <div class="p-4 flex-1 bg-white flex flex-col min-h-0 relative">
            <div class="flex justify-between items-center mb-4">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider select-none">批注说明 (点击文本区域可编辑)</label>
              <!-- 当处于编辑状态时，右上角提供一个“完成”按钮 -->
              <button v-show="isEditingText" @mousedown.prevent="stopEditingText" class="text-green-600 hover:text-green-700 text-xs font-semibold bg-green-50 px-3 py-1 rounded-full transition-colors flex items-center cursor-pointer">
                <i class="fa-solid fa-check mr-1"></i> 完成
              </button>
              <!-- 当处于预览状态时，提供一个“只读锁定”开关，方便演示防误触 -->
              <button v-show="!isEditingText" @click.stop="isLocked = !isLocked" class="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all flex items-center cursor-pointer select-none border" :class="isLocked ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-700'" :title="isLocked ? '已锁定只读预览，点击解锁以编辑' : '锁定只读预览（演示防误触）'">
                <i :class="isLocked ? 'fa-solid fa-lock mr-1 text-[8px]' : 'fa-solid fa-lock-open mr-1 text-[8px]'"></i>
                {{ isLocked ? '只读锁定' : '编辑未锁' }}
              </button>
            </div>

            <!-- 编辑模式 -->
            <div v-show="isEditingText" class="flex-1 flex flex-col min-h-0">
              <!-- Markdown 工具栏 -->
              <div class="flex flex-wrap gap-1 mb-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 select-none">
                <button @mousedown.prevent="insertMarkdown('**', '**')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="粗体"><i class="fa-solid fa-bold text-xs"></i></button>
                <button @mousedown.prevent="insertMarkdown('*', '*')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="斜体"><i class="fa-solid fa-italic text-xs"></i></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @mousedown.prevent="insertMarkdown('# ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="一级标题"><i class="fa-solid fa-heading text-xs"></i></button>
                <button @mousedown.prevent="insertMarkdown('## ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="二级标题"><span class="font-bold text-[10px]">H2</span></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @mousedown.prevent="insertMarkdown('- ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="无序列表"><i class="fa-solid fa-list-ul text-xs"></i></button>
                <button @mousedown.prevent="insertMarkdown('1. ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="有序列表"><i class="fa-solid fa-list-ol text-xs"></i></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @mousedown.prevent="insertMarkdown('> ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="引用"><i class="fa-solid fa-quote-left text-xs"></i></button>
                <button @mousedown.prevent="insertMarkdown(String.fromCharCode(96), String.fromCharCode(96))" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="行内代码"><i class="fa-solid fa-code text-xs"></i></button>
                <button @mousedown.prevent="insertMarkdown(String.fromCharCode(10) + String.fromCharCode(96, 96, 96) + String.fromCharCode(10), String.fromCharCode(10) + String.fromCharCode(96, 96, 96) + String.fromCharCode(10))" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="代码块"><i class="fa-solid fa-file-code text-xs"></i></button>
                <button @mousedown.prevent="insertMarkdown('[', '](https://)')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="链接"><i class="fa-solid fa-link text-xs"></i></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @mousedown.prevent="insertMarkdownTable" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="插入表格"><i class="fa-solid fa-table text-xs"></i></button>
                <button @mousedown.prevent="addTableRow" class="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition flex items-center justify-center self-center h-6 cursor-pointer animate-fade-in" title="在当前表格行下方添加行"><i class="fa-solid fa-plus mr-0.5 text-[8px]"></i>行</button>
                <button @mousedown.prevent="addTableCol" class="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition flex items-center justify-center self-center h-6 cursor-pointer animate-fade-in" title="在当前表格右侧添加列"><i class="fa-solid fa-plus mr-0.5 text-[8px]"></i>列</button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @mousedown.prevent="triggerFileInput" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="插入图片"><i class="fa-solid fa-image text-xs"></i></button>
                <input type="file" ref="fileInputRef" accept="image/*" @change="handleFileSelect" class="hidden" />
              </div>

              <textarea ref="textareaRef"
                        v-model="activePinData.pin.text"
                        @input="persistPins"
                        @blur="onTextareaBlur"
                        @paste="handlePaste"
                        @dragover.prevent
                        @drop.prevent="handleDrop"
                        class="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm resize-none text-gray-700 transition-colors placeholder-gray-400 leading-relaxed font-mono min-h-[120px]" 
                        placeholder="支持 Markdown 语法，可直接粘贴/拖拽截图，或直接粘贴 Excel 表格..."></textarea>
            </div>
            
            <!-- 预览模式 (Markdown 渲染) -->
            <div v-show="!isEditingText" 
                 class="w-full flex-1 p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 break-words cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-colors overflow-y-auto min-h-[120px] select-text
                        [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:border-b [&>h1]:pb-2
                        [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3
                        [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2
                        [&>p]:mb-3 [&>p:last-child]:mb-0
                        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3
                        [&_a]:text-blue-600 [&_a]:underline
                        [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:mb-3
                        [&_code]:bg-gray-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-red-500
                        [&>pre]:bg-gray-800 [&>pre]:text-white [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:mb-3 [&>pre_code]:bg-transparent [&>pre_code]:text-blue-300 [&>pre_code]:px-0
                        [&>table]:w-full [&>table]:border-collapse [&>table]:my-3 [&>table]:border [&>table]:border-gray-200
                        [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:border [&_th]:border-gray-200 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold
                        [&_td]:p-2 [&_td]:border [&_td]:border-gray-200 [&_td]:text-xs
                        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:shadow-md [&_img]:my-2"
                 v-html="renderMarkdown(activePinData.pin.text) || '<span class=\\'text-gray-400 italic\\'>点击输入说明...</span>'"
                 @click="startEditingText($event)"
                 title="点击进行编辑">
            </div>

            <!-- 底部控制栏 (透明度调节) -->
            <div class="mt-3 pt-2 border-t border-gray-100 flex items-center text-xs text-gray-400 select-none">
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-circle-half-stroke text-gray-400"></i>
                <span>不透明度</span>
                <input type="range" min="0.15" max="1.0" step="0.05" 
                       v-model.number="panelOpacity" 
                       class="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none" />
                <span class="font-mono w-8 text-right">{{ Math.round(panelOpacity * 100) }}%</span>
              </div>
            </div>

            
            <!-- 8方向调整大小手柄 -->
            <!-- 1. 四边 (透明拉伸条) -->
            <div @mousedown="startResize($event, 'n')" class="absolute top-0 left-2 right-2 h-1 cursor-n-resize z-[10002] select-none"></div>
            <div @mousedown="startResize($event, 's')" class="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize z-[10002] select-none"></div>
            <div @mousedown="startResize($event, 'w')" class="absolute top-2 bottom-2 left-0 w-1 cursor-w-resize z-[10002] select-none"></div>
            <div @mousedown="startResize($event, 'e')" class="absolute top-2 bottom-2 right-0 w-1 cursor-e-resize z-[10002] select-none"></div>
            
            <!-- 2. 四角 -->
            <div @mousedown="startResize($event, 'nw')" class="absolute top-0 left-0 w-2.5 h-2.5 cursor-nw-resize z-[10003] select-none"></div>
            <div @mousedown="startResize($event, 'ne')" class="absolute top-0 right-0 w-2.5 h-2.5 cursor-ne-resize z-[10003] select-none"></div>
            <div @mousedown="startResize($event, 'sw')" class="absolute bottom-0 left-0 w-2.5 h-2.5 cursor-sw-resize z-[10003] select-none"></div>
            <!-- 右下角拉伸把手，带有视觉小斜线 -->
            <div @mousedown="startResize($event, 'se')" class="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 z-[10003] select-none" title="调整大小">
              <svg class="w-3 h-3 text-gray-400 pointer-events-none hover:text-blue-500 transition-colors" viewBox="0 0 10 10">
                <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.5" />
                <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const isAnnotating = ref(false);
    const isHidden = ref(false);
    const pins = ref([]);
    const activePinId = ref(null);
    const isEditingText = ref(false); // 就地编辑状态
    const isLocked = ref(false); // 演示只读锁定状态
    const panelOpacity = ref(1.0); // 面板不透明度设置
    const textareaRef = ref(null);
    const fileInputRef = ref(null);
    const renderedPins = ref([]);
    let rafId = null;

    // 拖拽相关状态
    const panelPosition = ref({ x: null, y: null });
    const isDragging = ref(false);
    let dragOffset = { x: 0, y: 0 };

    // 拉伸大小相关状态
    const panelWidth = ref(400);
    const panelHeight = ref(450);
    const isResizing = ref(false);
    let resizeStartSize = { w: 0, h: 0 };
    let resizeStartPos = { x: 0, y: 0 };
    let resizeStartOffset = { x: 0, y: 0 };
    let currentResizeDirection = '';

    // 支持外部强行注入 pageId 或者取 URL
    const getPageId = () => window.__PINMARK_PAGE__ || (window.location.pathname + (window.location.hash || ''));
    const currentPageId = ref(getPageId());
    
    const defaultProjectId = window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'global';
    const storageKey = `pinmark_data_${defaultProjectId}`;

    const filteredPins = computed(() => {
      return pins.value.filter(pin => pin.pageId === currentPageId.value);
    });

    const updatePinPositions = () => {
      let currentVisibleIndex = 1;
      renderedPins.value = filteredPins.value.map((pin) => {
        let finalX = pin.x;
        let finalY = pin.y;
        let isVisible = true;

        if (pin.targetSelector) {
          try {
            const el = document.querySelector(pin.targetSelector);
            if (el && el.getBoundingClientRect) {
              const rect = el.getBoundingClientRect();
              // 如果元素长宽为0或者被隐藏，则不显示该图钉 (例如弹窗关闭了)
              if (rect.width === 0 && rect.height === 0) {
                isVisible = false;
              } else {
                finalX = rect.left + rect.width * pin.percentX + window.scrollX;
                finalY = rect.top + rect.height * pin.percentY + window.scrollY;
                
                // 解决 Element Plus 弹窗层叠问题：如果打开了遮罩，且目标元素不在遮罩内，则暂时隐藏该图钉防止穿透
                const activeOverlay = Array.from(document.querySelectorAll('.el-overlay')).find(o => getComputedStyle(o).display !== 'none');
                if (activeOverlay && !el.closest('.el-overlay')) {
                  isVisible = false;
                }
              }
            } else {
               isVisible = false; // 找不到元素(如弹窗销毁)也隐藏
            }
          } catch(e) {
            // CSS选择器错误等情况，降级到坐标
          }
        }
        
        let displayIndex = 0;
        if (isVisible) {
          displayIndex = currentVisibleIndex++;
        }
        
        return {
          ...pin,
          renderedX: finalX,
          renderedY: finalY,
          isVisible,
          displayIndex
        };
      });
      
      // 当激活的图钉被隐藏时（例如关闭了弹窗），自动关闭面板
      if (activePinId.value) {
        const activeObj = renderedPins.value.find(p => p.id === activePinId.value);
        if (activeObj && !activeObj.isVisible) {
          activePinId.value = null;
        }
      }

      rafId = requestAnimationFrame(updatePinPositions);
    };

    const activePinData = computed(() => {
      if (!activePinId.value) return null;
      const index = filteredPins.value.findIndex(p => p.id === activePinId.value);
      if (index === -1) {
        nextTick(closePanel);
        return null;
      }
      const renderedPin = renderedPins.value.find(p => p.id === activePinId.value);
      return {
        pin: filteredPins.value[index],
        displayIndex: renderedPin ? renderedPin.displayIndex : (index + 1)
      };
    });

    const panelStyle = computed(() => {
      const style = {
        width: panelWidth.value + 'px',
        height: panelHeight.value + 'px',
        opacity: panelOpacity.value,
      };
      if (panelPosition.value.x !== null) {
        style.left = panelPosition.value.x + 'px';
        style.top = panelPosition.value.y + 'px';
        style.transition = isDragging.value || isResizing.value ? 'none' : 'none';
      } else {
        style.right = '24px';
        style.top = '24px';
        style.transition = isResizing.value ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      return style;
    });

    const loadPins = async () => {
      try {
        // 1. 尝试从 Vite 本地开发服务器拉取数据
        const res = await fetch('/__pinmark_api/load');
        if (res.ok) {
          pins.value = await res.json();
          return;
        }
      } catch (e) {
        // 网络请求失败说明在线上环境，往下走
      }
      
      try {
        // 2. 线上生产环境：尝试加载静态打包的预设标签配置文件
        const staticRes = await fetch('/.pinmarks.json?t=' + Date.now());
        if (staticRes.ok) {
          pins.value = await staticRes.json();
        }
      } catch(e) {}
    };

    const persistPins = () => {
      const dataStr = JSON.stringify(pins.value);

      // 直接尝试推送到 Vite 本地开发服务器进行物理落盘
      fetch('/__pinmark_api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr
      }).catch(e => {
        // 线上环境没有此接口，保存会静默失败，此时标签只存在于本次浏览器的内存中
        // 用户一刷新页面就会全部丢弃，完全符合阅后即焚的需求
      });
    };

    const onHashChange = () => {
      currentPageId.value = getPageId();
      closePanel(); 
    };

    // 监听 History API 变化
    const onHistoryChange = () => {
      setTimeout(() => {
        currentPageId.value = getPageId();
        closePanel();
      }, 50);
    };

    // 如果宿主手动修改了 __PINMARK_PAGE__，可以通过触发自定义事件来通知更新
    const onManualPageChange = () => {
      currentPageId.value = getPageId();
      closePanel();
    };

    onMounted(() => {
      loadPins();
      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('hashchange', onHashChange);
      window.addEventListener('popstate', onHistoryChange);
      window.addEventListener('pushstate', onHistoryChange);
      window.addEventListener('replacestate', onHistoryChange);
      window.addEventListener('pinmark:pagechange', onManualPageChange);

      rafId = requestAnimationFrame(updatePinPositions);

      // 拦截 History API，派发自定义事件，以支持 Vue Router 等 History 模式的 SPA
      if (!window.__PINMARK_HISTORY_PATCHED__) {
        const originalPushState = history.pushState;
        history.pushState = function() {
          originalPushState.apply(this, arguments);
          window.dispatchEvent(new Event('pushstate'));
        };
        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
          originalReplaceState.apply(this, arguments);
          window.dispatchEvent(new Event('replacestate'));
        };
        window.__PINMARK_HISTORY_PATCHED__ = true;
      }
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHistoryChange);
      window.removeEventListener('pushstate', onHistoryChange);
      window.removeEventListener('replacestate', onHistoryChange);
      window.removeEventListener('pinmark:pagechange', onManualPageChange);
      if (rafId) cancelAnimationFrame(rafId);
      stopDrag();
    });

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        isAnnotating.value = false;
        closePanel();
      }
    };

    const toggleVisibility = () => {
      isHidden.value = !isHidden.value;
      if (isHidden.value) {
        closePanel();
        isAnnotating.value = false;
      }
    };

    const toggleMode = () => {
      if (isHidden.value) isHidden.value = false;
      isAnnotating.value = !isAnnotating.value;
      if (!isAnnotating.value) {
        closePanel();
      }
    };

    const handleCanvasClick = (e) => {
      // 暂时隐藏遮罩层以便获取底下的真实 DOM 元素
      const maskEl = e.currentTarget;
      const originalDisplay = maskEl.style.display;
      maskEl.style.display = 'none';
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      maskEl.style.display = originalDisplay;

      let targetSelector = '';
      let percentX = 0;
      let percentY = 0;

      if (targetEl) {
        targetSelector = getCssPath(targetEl);
        const rect = targetEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          percentX = (e.clientX - rect.left) / rect.width;
          percentY = (e.clientY - rect.top) / rect.height;
        }
      }

      const newPin = {
        id: 'pin_' + Date.now(),
        x: e.pageX, 
        y: e.pageY,
        pageId: currentPageId.value,
        text: '',
        targetSelector,
        percentX,
        percentY
      };

      pins.value.push(newPin);
      activePinId.value = newPin.id;
      isEditingText.value = true; 
      persistPins();
      isAnnotating.value = false;
      panelPosition.value = { x: null, y: null };
    };

    const togglePinContent = (id) => {
      if (activePinId.value === id) {
        closePanel();
      } else {
        activePinId.value = id;
        isAnnotating.value = false;
        panelPosition.value = { x: null, y: null };
        
        const pin = filteredPins.value.find(p => p.id === id);
        isEditingText.value = !(pin && pin.text.trim().length > 0);
      }
    };

    const closePanel = () => {
      activePinId.value = null;
    };

    const deletePin = (id) => {
      pins.value = pins.value.filter(p => p.id !== id);
      activePinId.value = null; 
      persistPins();
    };
    
    const startEditingText = (e) => {
      // 演示只读锁定模式下，禁止切换为编辑模式
      if (isLocked.value) {
        return;
      }
      // 允许点击超链接正常跳转，而不抢占为编辑激活事件
      if (e && e.target && e.target.closest('a')) {
        return;
      }
      isEditingText.value = true;
      nextTick(() => {
        if (textareaRef.value) {
          textareaRef.value.focus();
        }
      });
    };

    const stopEditingText = () => {
      isEditingText.value = false;
      persistPins();
    };

    const onTextareaBlur = () => {
      setTimeout(() => {
        if (document.activeElement !== textareaRef.value) {
          isEditingText.value = false;
          persistPins();
        }
      }, 150);
    };

    const previewAttachment = (type, data) => {
      previewAttachmentData.value = { type, data };
    };

    const closeAttachmentPreview = () => {
      previewAttachmentData.value = null;
    };

    const deleteAttachment = (type, id) => {
      if (activePinData.value && activePinData.value.pin) {
        const pin = activePinData.value.pin;
        if (type === 'image' && pin.images) {
          delete pin.images[id];
        } else if (type === 'table' && pin.tables) {
          delete pin.tables[id];
        }
        persistPins();
      }
    };

    const renderMarkdown = (text) => {
      if (!text) return '';
      let processedText = text;
      const pin = activePinData.value?.pin;
      if (pin && pin.images) {
        processedText = processedText.replace(/!\[(.*?)\]\((img_[a-z0-9]+)\)/g, (match, alt, imgId) => {
          const base64 = pin.images[imgId];
          return base64 ? `![${alt}](${base64})` : match;
        });
      }

      // 定制 Marked.js A 标签渲染：一律在新标签页打开，防止打断页面当前工作状态
      const customRenderer = new marked.Renderer();
      customRenderer.link = (href, title, text) => {
        let finalHref = href;
        let finalTitle = title;
        let finalText = text;
        if (typeof href === 'object') {
          finalHref = href.href;
          finalTitle = href.title;
          finalText = href.text;
        }
        return `<a href="${finalHref}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-700 transition-colors">${finalText || finalHref}</a>`;
      };

      return marked.parse(processedText, { breaks: true, renderer: customRenderer });
    };

    const insertMarkdown = (prefix, suffix = '') => {
      const el = textareaRef.value;
      if (!el || !activePinData.value) return;
      
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = activePinData.value.pin.text || '';
      const selectedText = text.substring(start, end);
      
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      
      activePinData.value.pin.text = newText;
      persistPins();
      
      nextTick(() => {
        el.focus();
        if (selectedText) {
          el.setSelectionRange(start + prefix.length, end + prefix.length);
        } else {
          el.setSelectionRange(start + prefix.length, start + prefix.length);
        }
      });
    };

    // 5. 图片压缩与 Base64 自动保存并插入占位符
    const compressAndInsertImage = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          const imgId = 'img_' + Math.random().toString(36).substring(2, 9);
          if (activePinData.value && activePinData.value.pin) {
            const pin = activePinData.value.pin;
            if (!pin.images) {
              pin.images = {};
            }
            pin.images[imgId] = compressedBase64;
            insertMarkdown(`\n![图片](${imgId})\n`);
            persistPins();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    // 6. 解析 Excel/WPS 表格文本为 Markdown 表格
    const parseExcelToMarkdownTable = (text) => {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length === 0) return null;
      
      const hasTab = lines.some(line => line.includes('\t'));
      if (!hasTab) return null;
      
      const rows = lines.map(line => line.split('\t').map(cell => cell.trim().replace(/\|/g, '\\|')));
      if (rows.length === 0 || rows[0].length < 1) return null;
      
      const colCount = Math.max(...rows.map(r => r.length));
      
      let md = '\n';
      const header = rows[0];
      while (header.length < colCount) header.push('');
      md += '| ' + header.join(' | ') + ' |\n';
      
      md += '| ' + new Array(colCount).fill('---').join(' | ') + ' |\n';
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        while (row.length < colCount) row.push('');
        md += '| ' + row.join(' | ') + ' |\n';
      }
      
      return md + '\n';
    };

    // 7. 监听剪贴板粘贴
    const handlePaste = (e) => {
      const clipboardData = e.clipboardData || clipboardData;
      if (!clipboardData) return;
      
      if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) compressAndInsertImage(file);
            return;
          }
        }
      }
      
      const plainText = clipboardData.getData('text/plain');
      if (plainText) {
        const tableMd = parseExcelToMarkdownTable(plainText);
        if (tableMd) {
          e.preventDefault();
          insertMarkdown(tableMd);
          return;
        }
      }
    };

    // 8. 监听拖拽图片
    const handleDrop = (e) => {
      const files = e.dataTransfer ? e.dataTransfer.files : null;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            compressAndInsertImage(files[i]);
          }
        }
      }
    };

    // 8.5 表格快速增加行和列辅助方法
    const addTableRow = () => {
      const el = textareaRef.value;
      if (!el || !activePinData.value) return;
      
      const text = activePinData.value.pin.text || '';
      const cursorOffset = el.selectionStart;
      
      // 1. 获取光标所在的整行文本
      const lastNewLine = text.lastIndexOf('\n', cursorOffset - 1);
      const startOfLine = lastNewLine === -1 ? 0 : lastNewLine + 1;
      const nextNewLine = text.indexOf('\n', cursorOffset);
      const endOfLine = nextNewLine === -1 ? text.length : nextNewLine;
      const currentLineText = text.substring(startOfLine, endOfLine);
      
      // 2. 检查这一行是否包含 '|' 字符，作为 Markdown 表格行的标志
      if (!currentLineText.includes('|')) {
        // 如果不在表格内，默认光标处插一行普通的表格模板
        const tableTemplate = `\n| 单元格 | 单元格 | 单元格 |\n`;
        insertMarkdown(tableTemplate);
        return;
      }
      
      // 3. 计算这一行的列数 (以 | 字符数量计算)
      const parts = currentLineText.split('|');
      let colCount = parts.length - 2;
      if (colCount < 1) colCount = 1;
      
      // 4. 生成新空行
      const newRowText = `\n| ` + new Array(colCount).fill('   ').join(' | ') + ` |`;
      
      // 5. 在当前行末尾插入新行
      const newText = text.substring(0, endOfLine) + newRowText + text.substring(endOfLine);
      activePinData.value.pin.text = newText;
      persistPins();
      
      // 6. 光标聚焦并移动到新行的第一个单元格内
      nextTick(() => {
        el.focus();
        const newCursorPos = endOfLine + newRowText.indexOf('   ') + 1;
        el.setSelectionRange(newCursorPos, newCursorPos + 1);
      });
    };

    const addTableCol = () => {
      const el = textareaRef.value;
      if (!el || !activePinData.value) return;
      
      const text = activePinData.value.pin.text || '';
      const cursorOffset = el.selectionStart;
      
      // 1. 获取光标所在的物理行起始与表格边界
      const lines = text.split('\n');
      
      let cursorLineIndex = 0;
      let accLength = 0;
      for (let i = 0; i < lines.length; i++) {
        const nextAcc = accLength + lines[i].length + (i === lines.length - 1 ? 0 : 1);
        if (cursorOffset >= accLength && cursorOffset <= nextAcc) {
          cursorLineIndex = i;
          break;
        }
        accLength = nextAcc;
      }
      
      // 2. 检查光标所在行是否属于表格
      if (!lines[cursorLineIndex] || !lines[cursorLineIndex].includes('|')) {
        return;
      }
      
      // 3. 向上向下搜索，找到属于该表格的所有连续行
      let startLine = cursorLineIndex;
      while (startLine > 0 && lines[startLine - 1].includes('|')) {
        startLine--;
      }
      let endLine = cursorLineIndex;
      while (endLine < lines.length - 1 && lines[endLine + 1].includes('|')) {
        endLine++;
      }
      
      // 4. 对表格的每一行增加一列
      for (let i = startLine; i <= endLine; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          const content = line.substring(1, line.length - 1);
          const cells = content.split('|');
          
          if (line.includes('---')) {
            cells.push(' --- ');
          } else {
            cells.push('  ');
          }
          lines[i] = '|' + cells.join('|') + '|';
        }
      }
      
      // 5. 重新拼装并赋值
      activePinData.value.pin.text = lines.join('\n');
      persistPins();
      
      // 6. 光标回到原处
      nextTick(() => {
        el.focus();
        el.setSelectionRange(cursorOffset, cursorOffset);
      });
    };

    // 9. 工具栏事件绑定
    const insertMarkdownTable = () => {
      const tableTemplate = `\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 单元格 | 单元格 | 单元格 |\n| 单元格 | 单元格 | 单元格 |\n`;
      insertMarkdown(tableTemplate);
    };

    const triggerFileInput = () => {
      if (fileInputRef.value) {
        fileInputRef.value.click();
      }
    };

    const handleFileSelect = (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        compressAndInsertImage(files[0]);
        e.target.value = '';
      }
    };

    // 拖拽逻辑 (控制面板位置)
    const startDrag = (e) => {
      isDragging.value = true;
      const panelEl = document.getElementById('annotator-panel');
      const rect = panelEl.getBoundingClientRect();
      
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;

      if (panelPosition.value.x === null) {
         panelPosition.value.x = rect.left;
         panelPosition.value.y = rect.top;
      }

      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
    };

    const onDrag = (e) => {
      if (!isDragging.value) return;
      panelPosition.value.x = e.clientX - dragOffset.x;
      panelPosition.value.y = e.clientY - dragOffset.y;
    };

    const stopDrag = () => {
      isDragging.value = false;
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };

    // 拉伸调整大小逻辑
    // 八方向拉伸大小调整逻辑
    const startResize = (e, direction) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.value = true;
      
      resizeStartSize.w = panelWidth.value;
      resizeStartSize.h = panelHeight.value;
      resizeStartPos.x = e.clientX;
      resizeStartPos.y = e.clientY;
      
      const panelEl = document.getElementById('annotator-panel');
      const rect = panelEl.getBoundingClientRect();
      if (panelPosition.value.x === null) {
        panelPosition.value.x = rect.left;
        panelPosition.value.y = rect.top;
      }
      resizeStartOffset.x = panelPosition.value.x;
      resizeStartOffset.y = panelPosition.value.y;
      
      currentResizeDirection = direction;
      
      window.addEventListener('mousemove', onResize);
      window.addEventListener('mouseup', stopResize);
    };

    const onResize = (e) => {
      if (!isResizing.value) return;
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      const minW = 300;
      const maxW = 800;
      const minH = 260;
      const maxH = 800;
      
      // X 轴方向拉伸计算
      if (currentResizeDirection.includes('e')) {
        panelWidth.value = Math.max(minW, Math.min(maxW, resizeStartSize.w + deltaX));
      } else if (currentResizeDirection.includes('w')) {
        const targetWidth = Math.max(minW, Math.min(maxW, resizeStartSize.w - deltaX));
        const realDeltaX = targetWidth - resizeStartSize.w;
        panelWidth.value = targetWidth;
        panelPosition.value.x = resizeStartOffset.x - realDeltaX;
      }
      
      // Y 轴方向拉伸计算
      if (currentResizeDirection.includes('s')) {
        panelHeight.value = Math.max(minH, Math.min(maxH, resizeStartSize.h + deltaY));
      } else if (currentResizeDirection.includes('n')) {
        const targetHeight = Math.max(minH, Math.min(maxH, resizeStartSize.h - deltaY));
        const realDeltaY = targetHeight - resizeStartSize.h;
        panelHeight.value = targetHeight;
        panelPosition.value.y = resizeStartOffset.y - realDeltaY;
      }
    };

    const stopResize = () => {
      isResizing.value = false;
      window.removeEventListener('mousemove', onResize);
      window.removeEventListener('mouseup', stopResize);
    };

    return {
      isAnnotating,
      filteredPins,
      renderedPins,
      activePinId,
      activePinData,
      panelStyle,
      isEditingText,
      isLocked,
      panelOpacity,
      isHidden,
      textareaRef,
      fileInputRef,
      startDrag,
      startResize,
      toggleVisibility,
      toggleMode,
      handleCanvasClick,
      togglePinContent,
      closePanel,
      deletePin,
      persistPins,
      startEditingText,
      stopEditingText,
      onTextareaBlur,
      renderMarkdown,
      insertMarkdown,
      handlePaste,
      handleDrop,
      insertMarkdownTable,
      addTableRow,
      addTableCol,
      triggerFileInput,
      handleFileSelect
    };
  }
};

// 4. 自动挂载逻辑
const mountPinMark = () => {
  if (document.getElementById('pinmark-core-root')) return;

  const rootDiv = document.createElement('div');
  rootDiv.id = 'pinmark-core-root';
  // 插入到最前端，或者最后，只要 CSS z-index 够大就行
  // 设置绝对定位，防止破坏宿主可能存在的 body flex 布局
  rootDiv.style.position = 'absolute';
  rootDiv.style.top = '0';
  rootDiv.style.left = '0';
  rootDiv.style.width = '100%';
  rootDiv.style.height = '100%';
  rootDiv.style.pointerEvents = 'none'; // 防止遮挡业务页面的点击
  document.body.appendChild(rootDiv);

  const app = createApp(PinMarkComponent);
  app.mount('#pinmark-core-root');
};

mountPinMark();
