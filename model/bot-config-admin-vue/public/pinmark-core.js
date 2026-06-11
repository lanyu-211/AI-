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
           class="fixed w-[400px] bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] z-[9999] pointer-events-auto flex flex-col rounded-2xl border border-gray-100 overflow-hidden"
           :style="panelStyle">
        
        <div v-if="activePinData" class="flex-1 flex flex-col">
          <!-- 面板头部 (拖拽把手) -->
          <div @mousedown="startDrag" class="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-gray-50/80 cursor-move select-none hover:bg-gray-100 transition-colors" title="按住拖动面板">
            <div class="flex items-center pointer-events-none">
              <i class="fa-solid fa-grip-vertical text-gray-400 mr-3"></i>
              <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                {{ activePinData.displayIndex }}
              </div>
              <h3 class="font-medium text-gray-700 text-base">批注详情</h3>
            </div>
            <div class="flex space-x-2">
              <button @click.stop="deletePin(activePinData.pin.id)" class="w-8 h-8 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer" title="删除批注">
                <i class="fa-solid fa-trash text-sm"></i>
              </button>
              <button @click.stop="closePanel" class="w-8 h-8 rounded hover:bg-gray-200 text-gray-500 transition-colors flex items-center justify-center cursor-pointer" title="关闭面板">
                <i class="fa-solid fa-xmark text-base"></i>
              </button>
            </div>
          </div>

          <!-- 面板内容区 -->
          <div class="p-6 flex-1 bg-white overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider">批注说明 (Markdown)</label>
              <button @click="toggleEditMode" class="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors flex items-center bg-blue-50 px-3 py-1 rounded-full">
                <i :class="isPreviewMode ? 'fa-solid fa-pen mr-1.5' : 'fa-solid fa-eye mr-1.5'"></i>
                {{ isPreviewMode ? '编辑' : '预览' }}
              </button>
            </div>

            <!-- 编辑模式 -->
            <div v-show="!isPreviewMode" class="flex flex-col">
              <!-- Markdown 工具栏 -->
              <div class="flex flex-wrap gap-1 mb-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <button @click="insertMarkdown('**', '**')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="粗体"><i class="fa-solid fa-bold text-xs"></i></button>
                <button @click="insertMarkdown('*', '*')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="斜体"><i class="fa-solid fa-italic text-xs"></i></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @click="insertMarkdown('# ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="一级标题"><i class="fa-solid fa-heading text-xs"></i></button>
                <button @click="insertMarkdown('## ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="二级标题"><span class="font-bold text-[10px]">H2</span></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @click="insertMarkdown('- ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="无序列表"><i class="fa-solid fa-list-ul text-xs"></i></button>
                <button @click="insertMarkdown('1. ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="有序列表"><i class="fa-solid fa-list-ol text-xs"></i></button>
                <div class="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                <button @click="insertMarkdown('> ', '')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="引用"><i class="fa-solid fa-quote-left text-xs"></i></button>
                <button @click="insertMarkdown('\`', '\`')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="行内代码"><i class="fa-solid fa-code text-xs"></i></button>
                <button @click="insertMarkdown('\\n\`\`\`\\n', '\\n\`\`\`\\n')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="代码块"><i class="fa-solid fa-file-code text-xs"></i></button>
                <button @click="insertMarkdown('[', '](url)')" class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 text-gray-600 transition" title="链接"><i class="fa-solid fa-link text-xs"></i></button>
              </div>

              <textarea ref="textareaRef"
                        v-model="activePinData.pin.text"
                        @input="persistPins"
                        class="w-full h-56 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm resize-none text-gray-700 transition-colors placeholder-gray-400 leading-relaxed font-mono" 
                        placeholder="支持 Markdown 语法..."></textarea>
            </div>
            
            <!-- 预览模式 (Markdown 渲染) -->
            <div v-show="isPreviewMode" 
                 class="w-full min-h-[16rem] p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 break-words cursor-text hover:border-gray-200 transition-colors
                        [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:border-b [&>h1]:pb-2
                        [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3
                        [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2
                        [&>p]:mb-3 [&>p:last-child]:mb-0
                        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3
                        [&_a]:text-blue-600 [&_a]:underline
                        [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:mb-3
                        [&_code]:bg-gray-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-red-500
                        [&>pre]:bg-gray-800 [&>pre]:text-white [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:mb-3 [&>pre_code]:bg-transparent [&>pre_code]:text-blue-300 [&>pre_code]:px-0"
                 v-html="renderMarkdown(activePinData.pin.text) || '<span class=\\'text-gray-400 italic\\'>暂无内容...</span>'"
                 @dblclick="toggleEditMode"
                 title="双击进行编辑">
            </div>
            
            <div class="mt-6 flex items-start text-xs text-gray-400">
              <i class="fa-solid fa-link mt-0.5 mr-1.5"></i>
              <p>页面级坐标绑定模式，更稳定可靠。切换模块请确保 URL Hash 发生改变。</p>
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
    const isPreviewMode = ref(false);
    const textareaRef = ref(null);
    const renderedPins = ref([]);
    let rafId = null;

    // 拖拽相关状态
    const panelPosition = ref({ x: null, y: null });
    const isDragging = ref(false);
    let dragOffset = { x: 0, y: 0 };

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
      if (panelPosition.value.x !== null) {
        return {
          left: panelPosition.value.x + 'px',
          top: panelPosition.value.y + 'px',
          opacity: 1,
          transition: isDragging.value ? 'none' : 'opacity 0.3s'
        };
      }
      return {
        right: '24px',
        top: '24px',
        opacity: 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      };
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
      isPreviewMode.value = false; 
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
        isPreviewMode.value = pin && pin.text.trim().length > 0;
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
    
    const toggleEditMode = () => {
      isPreviewMode.value = !isPreviewMode.value;
      if (!isPreviewMode.value) {
        nextTick(() => {
          if (textareaRef.value) {
            textareaRef.value.focus();
          }
        });
      }
    };

    const renderMarkdown = (text) => {
      if (!text) return '';
      return marked.parse(text);
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

    return {
      isAnnotating,
      filteredPins,
      renderedPins,
      activePinId,
      activePinData,
      panelStyle,
      isPreviewMode,
      isHidden,
      textareaRef,
      startDrag,
      toggleVisibility,
      toggleMode,
      handleCanvasClick,
      togglePinContent,
      closePanel,
      deletePin,
      persistPins,
      toggleEditMode,
      renderMarkdown,
      insertMarkdown
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
