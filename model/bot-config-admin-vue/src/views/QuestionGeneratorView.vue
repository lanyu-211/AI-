<template>
  <div class="question-generator-container">
    <!-- 顶部步骤条 -->
    <div class="steps-wrapper card-shadow">
      <el-steps :active="activeStep" align-center finish-status="success">
        <el-step title="上传教学文档" description="支持 PDF/Word/TXT" />
        <el-step title="设定出题参数" description="配置题型与分值" />
        <el-step title="预览并下发习题" description="在线调整与一键发布" />
      </el-steps>
    </div>

    <!-- 主交互区域 -->
    <div class="generator-main">
      <!-- 步骤 1: 上传教学文档 -->
      <transition name="fade-slide" mode="out-in">
        <div v-if="activeStep === 0" class="step-content upload-step">
          <div class="upload-card card-shadow" :class="{ 'is-dragover': isDragOver }"
               @dragover.prevent="isDragOver = true"
               @dragleave.prevent="isDragOver = false"
               @drop.prevent="handleFileDrop">
            
            <div class="upload-icon-pulse">
              <el-icon class="upload-icon" :size="64"><Document /></el-icon>
            </div>
            
            <h3>拖拽教学内容文档到此处上传</h3>
            <p class="upload-tip">支持 PDF, Word, TXT 格式，单文件最大支持 50MB</p>
            
            <div class="file-select-btn">
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                @change="handleFileSelect"
              >
                <el-button type="primary" size="large" round class="action-btn">
                  选择本地文档上传
                </el-button>
              </el-upload>
            </div>

            <!-- 预置案例快速体验 -->
            <div class="quick-cases">
              <span class="label">快速体验案例：</span>
              <el-tag class="case-tag clickable" type="info" @click="quickStart('高中物理_牛顿运动定律详解.docx')">
                高中物理_牛顿运动定律详解.docx
              </el-tag>
              <el-tag class="case-tag clickable" type="info" @click="quickStart('AI大语言模型与Transformer原理.pdf')">
                AI大语言模型与Transformer原理.pdf
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 步骤 1.5: 正在智能解析文档 -->
        <div v-else-if="activeStep === 0.5" class="step-content parsing-step">
          <div class="parsing-card card-shadow">
            <div class="neural-loader">
              <div class="circle circle-1"></div>
              <div class="circle circle-2"></div>
              <div class="circle circle-3"></div>
            </div>
            <h2>正在智能解析教学文档...</h2>
            <div class="parsing-status">
              <span class="status-indicator"></span>
              {{ parsingStatusText }}
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: parseProgress + '%' }"></div>
            </div>
            <div class="progress-percentage">{{ parseProgress }}%</div>
          </div>
        </div>

        <!-- 步骤 2: 设定出题配置 -->
        <div v-else-if="activeStep === 1" class="step-content config-step">
          <div class="config-layout">
            <!-- 左侧：解析出的文档大纲及关键词 -->
            <div class="doc-summary-card card-shadow">
              <div class="card-header">
                <el-icon class="header-icon"><DocumentChecked /></el-icon>
                <span>文档解析信息</span>
              </div>
              <div class="doc-meta">
                <div class="meta-item">
                  <span class="label">文档名称:</span>
                  <span class="value text-ellipsis" :title="uploadedFileName">{{ uploadedFileName }}</span>
                </div>
                <div class="meta-item">
                  <span class="label">内容字数:</span>
                  <span class="value">{{ docWordsCount }} 字</span>
                </div>
              </div>

              <div class="outline-section">
                <div class="sub-title">章节结构大纲</div>
                <div class="outline-tree">
                  <div v-for="(node, index) in docOutline" :key="index" class="outline-node">
                    <span class="node-bullet"></span>
                    <span class="node-text">{{ node }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：出题参数与题量设置 -->
            <div class="config-params-card card-shadow">
              <div class="card-header">
                <el-icon class="header-icon"><Setting /></el-icon>
                <span>智能出题参数配置</span>
              </div>

              <el-form label-position="top">


                <!-- 出题范围 -->
                <el-form-item label="出题章节范围">
                  <el-input
                    :value="selectedScopeSummary"
                    placeholder="点击选择出题章节范围"
                    readonly
                    style="cursor: pointer;"
                    @click="openScopeDialog"
                  >
                    <template #suffix>
                      <el-icon class="el-input__icon clickable" @click="openScopeDialog" style="cursor: pointer;"><ArrowRight /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <!-- 题型与数量配置 -->
                <div class="question-types-section">
                  <div class="sub-title">设定各题型与分值</div>
                  <div class="types-grid">
                    <div class="type-counter-item">
                      <div class="type-header">
                        <span class="type-name">单选题</span>
                      </div>
                      <div class="type-controls">
                        <div class="control-group">
                          <span class="control-label">出题数:</span>
                          <el-input-number v-model="出题配置.types.choice" :min="0" :max="15" size="small" style="width: 80px;" />
                        </div>
                        <div class="control-group">
                          <span class="control-label">单题分:</span>
                          <el-input-number v-model="出题配置.scores.choice" :min="1" :max="50" size="small" style="width: 80px;" />
                        </div>
                      </div>
                    </div>

                    <div class="type-counter-item">
                      <div class="type-header">
                        <span class="type-name">多选题</span>
                      </div>
                      <div class="type-controls">
                        <div class="control-group">
                          <span class="control-label">出题数:</span>
                          <el-input-number v-model="出题配置.types.multiple" :min="0" :max="10" size="small" style="width: 80px;" />
                        </div>
                        <div class="control-group">
                          <span class="control-label">单题分:</span>
                          <el-input-number v-model="出题配置.scores.multiple" :min="1" :max="50" size="small" style="width: 80px;" />
                        </div>
                      </div>
                    </div>

                    <div class="type-counter-item">
                      <div class="type-header">
                        <span class="type-name">填空题</span>
                      </div>
                      <div class="type-controls">
                        <div class="control-group">
                          <span class="control-label">出题数:</span>
                          <el-input-number v-model="出题配置.types.completion" :min="0" :max="10" size="small" style="width: 80px;" />
                        </div>
                        <div class="control-group">
                          <span class="control-label">单题分:</span>
                          <el-input-number v-model="出题配置.scores.completion" :min="1" :max="50" size="small" style="width: 80px;" />
                        </div>
                      </div>
                    </div>

                    <div class="type-counter-item">
                      <div class="type-header">
                        <span class="type-name">判断题</span>
                      </div>
                      <div class="type-controls">
                        <div class="control-group">
                          <span class="control-label">出题数:</span>
                          <el-input-number v-model="出题配置.types.judge" :min="0" :max="10" size="small" style="width: 80px;" />
                        </div>
                        <div class="control-group">
                          <span class="control-label">单题分:</span>
                          <el-input-number v-model="出题配置.scores.judge" :min="1" :max="50" size="small" style="width: 80px;" />
                        </div>
                      </div>
                    </div>

                    <div class="type-counter-item">
                      <div class="type-header">
                        <span class="type-name">简答题</span>
                      </div>
                      <div class="type-controls">
                        <div class="control-group">
                          <span class="control-label">出题数:</span>
                          <el-input-number v-model="出题配置.types.essay" :min="0" :max="5" size="small" style="width: 80px;" />
                        </div>
                        <div class="control-group">
                          <span class="control-label">单题分:</span>
                          <el-input-number v-model="出题配置.scores.essay" :min="1" :max="50" size="small" style="width: 80px;" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 生成按钮 -->
                <div class="generate-action-bar">
                  <el-button size="large" @click="activeStep = 0" round>重新上传</el-button>
                  <el-button type="primary" size="large" round class="generate-btn action-btn" @click="generateQuestions">
                    <el-icon class="btn-icon"><MagicStick /></el-icon> AI 一键生成习题
                  </el-button>
                </div>
              </el-form>
            </div>
          </div>
        </div>

        <!-- 步骤 2.5: AI正在生成题目中 -->
        <div v-else-if="activeStep === 1.5" class="step-content parsing-step">
          <div class="parsing-card card-shadow">
            <div class="neural-loader">
              <div class="pulsing-brain">🧠</div>
            </div>
            <h2>AI 正在分析大纲与内容生成题目...</h2>
            <div class="parsing-status">
              正在生成 {{ generatingText }}，并匹配精准答案解析
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: genProgress + '%' }"></div>
            </div>
            <div class="progress-percentage">{{ genProgress }}%</div>
          </div>
        </div>

        <!-- 步骤 3: 习题预览、编辑与下发 -->
        <div v-else-if="activeStep === 2" class="step-content preview-step">
          <div class="preview-layout">
            <!-- 左侧：题目列表 -->
            <div class="questions-list-wrapper">
              <div class="list-header">
                <h3>已生成试题预览（共 {{ totalQuestionsCount }} 题，总分 {{ totalQuestionsScore }} 分）</h3>
                <div class="header-actions">
                  <el-button type="primary" size="small" plain @click="handleAddCustomQuestion">+ 添加自定义题目</el-button>
                </div>
              </div>

              <div class="questions-list">
                <el-card v-for="(q, idx) in generatedQuestions" :key="q.id" class="question-card mb-4" shadow="hover">
                  <div class="q-card-header">
                    <div class="q-meta">
                      <el-tag size="small" type="primary" class="mr-2">第 {{ idx + 1 }} 题</el-tag>
                      <span class="q-type-label">{{ getTypeName(q.type) }}</span>
                    </div>
                    <div class="q-score">{{ q.score }} 分</div>
                  </div>

                  <!-- 题干编辑或展示 -->
                  <div class="q-body mt-3">
                    <div v-if="editingQuestionId === q.id" class="q-edit-box">
                      <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">编辑题干：</div>
                      <el-input v-model="q.title" type="textarea" :rows="2" placeholder="编辑题干..." />
                    </div>
                    <div v-else class="q-title">
                      {{ q.title }}
                    </div>

                    <!-- 选项（如果是选择题） -->
                    <div v-if="q.type === 'choice' || q.type === 'multiple'" class="q-options mt-3">
                      <!-- 编辑状态下的选项 -->
                      <template v-if="editingQuestionId === q.id">
                        <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">编辑选项：</div>
                        <div v-for="(opt, optKey) in q.options" :key="optKey" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                          <el-tag size="small" type="primary" effect="dark" style="width: 24px; text-align: center; justify-content: center;">{{ optKey }}</el-tag>
                          <el-input v-model="q.options[optKey]" size="default" placeholder="请输入选项内容..." style="flex: 1;" />
                        </div>
                      </template>
                      <!-- 展示状态下的选项 -->
                      <template v-else>
                        <div v-for="(opt, optKey) in q.options" :key="optKey" class="q-option">
                          <span class="option-key">{{ optKey }}.</span>
                          <span class="option-val">{{ opt }}</span>
                        </div>
                      </template>
                    </div>

                    <!-- 答案与解析面板 -->
                    <div class="answer-explain-panel mt-3">
                      <template v-if="editingQuestionId === q.id">
                        <div class="panel-content mt-2" style="background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
                          <div class="content-item" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span class="label" style="width: 80px; font-size: 13px; color: #64748b;">参考答案：</span>
                            <el-select v-if="q.type === 'choice'" v-model="q.answer" size="small" style="width: 100px;">
                              <el-option label="A" value="A" />
                              <el-option label="B" value="B" />
                              <el-option label="C" value="C" />
                              <el-option label="D" value="D" />
                            </el-select>
                            <el-select v-else-if="q.type === 'judge'" v-model="q.answer" size="small" style="width: 100px;">
                              <el-option label="对" value="对" />
                              <el-option label="错" value="错" />
                            </el-select>
                            <el-input v-else v-model="q.answer" size="small" placeholder="输入参考答案..." style="flex: 1;" />
                          </div>
                          <div class="content-item" style="display: flex; align-items: flex-start;">
                            <span class="label" style="width: 80px; font-size: 13px; color: #64748b; margin-top: 5px;">解析说明：</span>
                            <el-input v-model="q.explanation" type="textarea" :rows="2" size="small" placeholder="输入解析说明..." style="flex: 1;" />
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        <div class="panel-toggle clickable" @click="q.showExplain = !q.showExplain">
                          <span>{{ q.showExplain ? '隐藏' : '查看' }} 答案与解析</span>
                          <el-icon><ArrowDown v-if="!q.showExplain" /><ArrowUp v-else /></el-icon>
                        </div>

                        <transition name="el-zoom-in-top">
                          <div v-if="q.showExplain" class="panel-content mt-2">
                            <div class="content-item">
                              <span class="label">参考答案：</span>
                              <span class="value bold-text">{{ q.answer }}</span>
                            </div>
                            <div class="content-item mt-2">
                              <span class="label">解析说明：</span>
                              <span class="value text-secondary">{{ q.explanation }}</span>
                            </div>
                          </div>
                        </transition>
                      </template>
                    </div>
                  </div>

                  <!-- 卡片底部操作栏 -->
                  <div class="q-actions mt-3">
                    <el-button size="small" :type="editingQuestionId === q.id ? 'success' : 'default'" @click="toggleEditQuestion(q)">
                      <el-icon class="mr-1"><Edit /></el-icon>
                      {{ editingQuestionId === q.id ? '保存' : '修改题干' }}
                    </el-button>
                    
                    <el-button size="small" type="warning" plain :loading="q.isRegenerating" @click="regenerateSingleQuestion(q)">
                      <el-icon class="mr-1"><Refresh /></el-icon>
                      换一题
                    </el-button>
                    
                    <el-button size="small" type="danger" plain @click="deleteQuestion(q.id)">
                      <el-icon class="mr-1"><Delete /></el-icon>
                      删除
                    </el-button>
                  </div>
                </el-card>
              </div>
            </div>

            <!-- 右侧：下发与导出配置 -->
            <div class="preview-sidebar-card card-shadow">
              <div class="card-header">
                <el-icon class="header-icon"><Share /></el-icon>
                <span>习题发布</span>
              </div>

              <div class="action-buttons-group">
                <el-button type="primary" size="large" class="w-full action-btn dispatch-btn" round @click="openDispatchModal">
                  <el-icon class="mr-2"><Promotion /></el-icon> 一键发布
                </el-button>
                
                <el-button size="large" class="w-full" round @click="handleExport('PDF')">
                  <el-icon class="mr-2"><Download /></el-icon> 导出打印 PDF 版
                </el-button>

                <el-button size="large" class="w-full" round @click="handleExport('Word')">
                  <el-icon class="mr-2"><DocumentCopy /></el-icon> 导出为 Word 文档
                </el-button>
              </div>

              <div class="statistics-board">
                <div class="sub-title">本套题型分布</div>
                <div class="stat-items">
                  <div v-for="(count, type) in getTypesCount()" :key="type" class="stat-item">
                    <span class="name">{{ getTypeName(type) }}</span>
                    <span class="count">{{ count }} 道</span>
                  </div>
                </div>
              </div>

              <div class="back-link-box">
                <el-button link @click="activeStep = 1">← 返回调整出题参数</el-button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 弹窗：下发班级选择 -->
    <el-dialog
      v-model="dispatchDialogVisible"
      title="一键下发作业至学生"
      width="500px"
      destroy-on-close
      class="custom-dialog"
    >
      <el-form label-position="top">
        <el-form-item label="选择下发的目标班级" required>
          <el-select
            v-model="dispatchForm.classIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择需要下发的班级"
            style="width: 100%;"
          >
            <el-option
              v-for="c in appStore.classes"
              :key="c.id"
              :label="`${c.name} (${c.studentCount}人)`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="作业截止提交时间" required>
          <el-date-picker
            v-model="dispatchForm.endTime"
            type="datetime"
            placeholder="选择截止日期和时间"
            style="width: 100%;"
            format="YYYY-MM-DD HH:mm"
          />
        </el-form-item>

        <el-form-item label="作答要求与寄语">
          <el-input
            v-model="dispatchForm.comment"
            type="textarea"
            :rows="3"
            placeholder="示例：请同学们独立完成牛顿定律测验，限时45分钟，公式步骤请写在草稿纸上拍照上传..."
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dispatchDialogVisible = false">取消</el-button>
          <el-button type="primary" class="action-btn" :loading="isDispatching" @click="confirmDispatch">
            确认下发
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 弹窗：出题章节范围选择 -->
    <el-dialog
      v-model="scopeDialogVisible"
      title="选择出题章节范围"
      width="520px"
      destroy-on-close
      class="custom-dialog"
    >
      <div style="margin-bottom: 16px;">
        <el-checkbox
          v-model="checkAll"
          :indeterminate="isIndeterminate"
          @change="handleCheckAllChange"
        >
          全选所有章节
        </el-checkbox>
      </div>
      <el-divider style="margin: 12px 0;" />
      
      <el-checkbox-group
        v-model="selectedOutlineNodes"
        @change="handleCheckedNodesChange"
      >
        <div v-for="node in docOutline" :key="node" style="margin-bottom: 12px;">
          <el-checkbox :label="node" style="white-space: normal; height: auto; display: flex; align-items: flex-start;">
            <span style="line-height: 1.4; color: #334155; font-size: 14px; margin-left: 4px; display: inline-block;">
              {{ node }}
            </span>
          </el-checkbox>
        </div>
      </el-checkbox-group>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="scopeDialogVisible = false">取消</el-button>
          <el-button type="primary" class="action-btn" @click="confirmScopeSelection">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 弹窗：添加自定义题目配置 -->
    <el-dialog
      v-model="customQuestionDialogVisible"
      title="添加自定义题目"
      width="460px"
      destroy-on-close
      class="custom-dialog"
    >
      <el-form label-position="top">
        <el-form-item label="选择题目类型" required>
          <el-radio-group v-model="customQuestionForm.type" size="default" @change="handleCustomTypeChange">
            <el-radio-button label="choice">单选</el-radio-button>
            <el-radio-button label="multiple">多选</el-radio-button>
            <el-radio-button label="completion">填空</el-radio-button>
            <el-radio-button label="judge">判断</el-radio-button>
            <el-radio-button label="essay">简答</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="设定该题分值" required>
          <el-input-number v-model="customQuestionForm.score" :min="1" :max="100" size="default" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="customQuestionDialogVisible = false">取消</el-button>
          <el-button type="primary" class="action-btn" @click="confirmAddCustomQuestion">
            确定并编辑
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, DocumentChecked, Setting, MagicStick, ArrowDown, ArrowUp,
  Edit, Refresh, Delete, Share, Download, DocumentCopy, Promotion,
  ArrowRight
} from '@element-plus/icons-vue'

const appStore = useAppStore()

// 步骤状态控制： 0:上传, 0.5:解析中, 1:出题配置, 1.5:生成中, 2:预览与下发
const activeStep = ref(0)
watch(activeStep, (newVal) => {
  window.__PINMARK_PAGE__ = `question-generator-step-${newVal}`;
  window.dispatchEvent(new Event('pinmark:pagechange'));
})
const isDragOver = ref(false)

// 文档信息
const uploadedFileName = ref('')
const docWordsCount = ref(0)
const docKeywords = ref([])
const docOutline = ref([])

// 出题章节范围弹窗状态
const scopeDialogVisible = ref(false)
const selectedOutlineNodes = ref([])
const checkAll = ref(true)
const isIndeterminate = ref(false)

// 添加自定义题目弹窗状态
const customQuestionDialogVisible = ref(false)
const customQuestionForm = reactive({
  type: 'choice',
  score: 5
})

const openScopeDialog = () => {
  scopeDialogVisible.value = true
}

const handleCustomTypeChange = (type) => {
  customQuestionForm.score = 出题配置.scores[type] || 5
}

const selectedScopeSummary = computed(() => {
  if (selectedOutlineNodes.value.length === 0) {
    return '未选择任何章节'
  }
  if (selectedOutlineNodes.value.length === docOutline.value.length) {
    return '全部章节已选 (全文档范围)'
  }
  return `已选择 ${selectedOutlineNodes.value.length} 个章节`
})

const handleCheckAllChange = (val) => {
  selectedOutlineNodes.value = val ? [...docOutline.value] : []
  isIndeterminate.value = false
}

const handleCheckedNodesChange = (value) => {
  const checkedCount = value.length
  checkAll.value = checkedCount === docOutline.value.length
  isIndeterminate.value = checkedCount > 0 && checkedCount < docOutline.value.length
}

const confirmScopeSelection = () => {
  scopeDialogVisible.value = false
  ElMessage.success(`出题范围已锁定，共选择 ${selectedOutlineNodes.value.length} 个章节`)
}

// 解析与生成进度模拟
const parseProgress = ref(0)
const parsingStatusText = ref('')
const genProgress = ref(0)
const generatingText = ref('')

// 出题配置
const 出题配置 = reactive({
  scope: 'all',
  types: {
    choice: 5,
    multiple: 2,
    completion: 3,
    judge: 2,
    essay: 1
  },
  scores: {
    choice: 5,
    multiple: 6,
    completion: 4,
    judge: 3,
    essay: 10
  }
})

// 生成的习题集
const generatedQuestions = ref([])
const editingQuestionId = ref(null)

// 下发状态
const dispatchDialogVisible = ref(false)
const isDispatching = ref(false)
const dispatchForm = reactive({
  classIds: [],
  endTime: '',
  comment: ''
})

// 物理题库资源 (用于模拟牛顿运动定律生成)
const physicalQuestionsDb = {
  choice: [
    { id: 'pc1', type: 'choice', difficulty: '基础', score: 5, title: '关于惯性，下列说法正确的是：', options: { A: '物体在静止时才有惯性', B: '物体在速度大时惯性也大', C: '惯性是物体保持原有运动状态的属性，只与质量有关', D: '物体不受外力作用时才具有惯性' }, answer: 'C', explanation: '惯性是物体的固有属性，质量是惯性大小的唯一量度，与物体的运动状态或受力情况无关。', showExplain: false },
    { id: 'pc2', type: 'choice', difficulty: '进阶', score: 5, title: '一个物体放在升降机的地板上，当升降机加速上升时，物体处于什么状态：', options: { A: '超重状态', B: '失重状态', C: '完全失重状态', D: '平衡状态' }, answer: 'A', explanation: '升降机加速上升时，加速度方向向上，物体具有向上的加速度，处于超重状态，地板对物体的支持力大于其重力。', showExplain: false },
    { id: 'pc3', type: 'choice', difficulty: '进阶', score: 5, title: '在粗糙水平面上以相同初速度滑行的两个物体，它们的质量之比 m1:m2 = 1:2，若它们与水平面间的动摩擦因数相同，则它们滑行的最大距离之比为：', options: { A: '1 : 2', B: '2 : 1', C: '1 : 1', D: '1 : 4' }, answer: 'C', explanation: '根据牛顿第二定律，合外力提供加速度 f = μmg = ma，得 a = μg。根据运动学公式 v² - v0² = 2as，最大距离 s = v0² / (2μg)，距离只与初速度和动摩擦因数有关，与质量无关，故为 1:1。', showExplain: false },
    { id: 'pc4', type: 'choice', difficulty: '挑战', score: 5, title: '静止在光滑水平面上的物体，在水平恒力 F 的作用下开始运动。在物体获得速度 v 的瞬间，恒力 F 的瞬时功率为 P。若要使物体获得速度 2v，则在此瞬间恒力 F 的瞬时功率应为：', options: { A: 'P', B: '2P', C: '4P', D: '8P' }, answer: 'B', explanation: '瞬时功率公式为 P = Fv。由于恒力 F 不变，在速度变为 2v 时，功率 P\' = F*(2v) = 2Fv = 2P。', showExplain: false },
    { id: 'pc5', type: 'choice', difficulty: '基础', score: 5, title: '一辆汽车以加速度 a 从静止开始做匀加速直线运动。若仅将阻力增大为原来的 2 倍，且牵引力保持不变，则新的加速度 a\' 满足：', options: { A: 'a\' > a', B: 'a\' < a', C: 'a\' = a', D: '无法确定' }, answer: 'B', explanation: '根据牛顿第二定律，F - f = ma，其中 F 是牵引力，f 是阻力。当阻力增大时，合外力变小，故加速度 a\' = (F - 2f)/m 小于 a。', showExplain: false }
  ],
  multiple: [
    { id: 'pm1', type: 'multiple', difficulty: '进阶', score: 6, title: '关于超重和失重，下列说法中正确的是：', options: { A: '物体处于超重状态时，重力并没有变大', B: '物体处于失重状态时，重力变小了', C: '完全失重时，物体对支持面没有压力', D: '只要物体具有向上的加速度，它就处于超重状态' }, answer: 'A, C, D', explanation: '超重和失重的本质是视重的变化，实际重力 mg 并没有改变，故 A、C、D 正确。', showExplain: false },
    { id: 'pm2', type: 'multiple', difficulty: '进阶', score: 6, title: '关于牛顿第三定律，下列说法正确的是：', options: { A: '作用力与反作用力总是大小相等、方向相反', B: '作用力与反作用力作用在同一物体上', C: '作用力与反作用力必定是同一性质的力', D: '作用力与反作用力同时产生、同时消失' }, answer: 'A, C, D', explanation: '作用力和反作用力作用在两个不同的物体上，B错误；同性质且同时产生和消失，故A、C、D正确。', showExplain: false }
  ],
  completion: [
    { id: 'pk1', type: 'completion', difficulty: '基础', score: 4, title: '牛顿第二定律的数学表达式为 _______。', answer: 'F = ma', explanation: '牛顿第二定律指出物体的加速度与所受合外力成正比，与质量成反比，表达式为 F=ma。', showExplain: false },
    { id: 'pk2', type: 'completion', difficulty: '进阶', score: 4, title: '在探究加速度与力、质量的关系的实验中，我们采用的研究方法是 _______。', answer: '控制变量法', explanation: '在包含多个变量的物理规律研究中，通常先固定某些变量，重点探究其中两个变量的关系，这种方法叫做控制变量法。', showExplain: false },
    { id: 'pk3', type: 'completion', difficulty: '挑战', score: 4, title: '一个重 10N 的物体，放在倾角为 30 度的斜面上，恰能匀速下滑，物体与斜面间的动摩擦因数 μ = _______。', answer: '√3/3 (或 0.577)', explanation: '物体匀速下滑说明处于受力平衡状态。沿斜面方向 mg*sinθ = f = μ*mg*cosθ，因此 μ = tanθ = tan(30°) = √3/3。', showExplain: false }
  ],
  judge: [
    { id: 'pj1', type: 'judge', difficulty: '基础', score: 3, title: '作用力和反作用力作用在不同的物体上，因此它们不能进行合成。（ ）', answer: '对', explanation: '因为作用力与反作用力分别作用在两个发生相互作用的独立物体上，所以这两个力不能合成求合力。', showExplain: false },
    { id: 'pj2', type: 'judge', difficulty: '进阶', score: 3, title: '物体运动的方向就是物体所受合外力的方向。（ ）', answer: '错', explanation: '物体的加速度方向必定与合外力方向一致，但运动方向（速度方向）不一定与合外力方向一致。例如抛体运动或匀速圆周运动。', showExplain: false }
  ],
  essay: [
    { id: 'pe1', type: 'essay', difficulty: '挑战', score: 10, title: '请简述“超重”和“失重”的本质。在超重状态下，物体的重力真的增加了吗？请举出日常生活中相关的例子。', answer: '超重和失重的本质是物体具有向上或向下的加速度，从而导致支持物对物体的作用力（视重）大于或小于物体实际重力的现象。在超重状态下，物体的实际重力（mg）并没有增加，只是物体受到的支持力或拉力变大了。日常生活例子：乘坐电梯启动上升或急刹下降时会感到身体变重（超重）；电梯启动下降或急刹上升时会感到身体变轻（失重）。', showExplain: false }
  ]
}

// AI模型与Transformer题库资源
const aiQuestionsDb = {
  choice: [
    { id: 'ac1', type: 'choice', difficulty: '基础', score: 5, title: '在 Transformer 架构中，Self-Attention 机制的主要作用是：', options: { A: '进行序列局部特征提取', B: '捕获长距离词与词之间的依赖关系，并并行计算', C: '代替全连接层压缩维度', D: '对文本进行分类映射' }, answer: 'B', explanation: 'Self-Attention 机制允许模型在处理当前词时考虑到序列中的所有其他词，从而完美解决了传统 RNN 无法捕获长距离依赖及难以并行训练的缺陷。', showExplain: false },
    { id: 'ac2', type: 'choice', difficulty: '进阶', score: 5, title: '关于大语言模型（LLM）的 Temperature（温度）参数，以下说法正确的是：', options: { A: 'Temperature 越高，生成的文本确定性越高，越保守', B: 'Temperature 越低，生成的文本随机性越高，越有创意', C: 'Temperature 可以改变预测词表中各词的概率分布，越高使得分布越趋于均匀', D: 'Temperature 是模型训练时的超参数，推理时无法调整' }, answer: 'C', explanation: 'Temperature 控制推理采样的随机性。数值较高时，分母缩放会使得各词输出概率拉近，使采样分布更平缓（均匀），从而使生成内容更随机、多样；数值低则相反。', showExplain: false },
    { id: 'ac3', type: 'choice', difficulty: '挑战', score: 5, title: '在 RLHF（基于人类反馈的强化学习）中，通常用来代表“好坏评判标准”并训练用来引导 Policy 模型更新的子模型是：', options: { A: 'Actor 模型', B: 'Critic 模型', C: 'Reward Model（奖励模型）', D: 'Reference Model（参考模型）' }, answer: 'C', explanation: 'RLHF 阶段会单独训练一个 Reward Model（奖励模型），它负责接收大模型的输出并基于人类偏好打分，随后该得分会被作为 PPO 强化学习算法的奖励信号。', showExplain: false },
    { id: 'ac4', type: 'choice', difficulty: '基础', score: 5, title: '在 Transformer 的 Multi-Head Attention 中，设置“多头”的核心目的是：', options: { A: '提高参数运算的并行速度', B: '使模型能够从不同的子空间中学习文本信息，捕获多元语义关系', C: '增加模型的非线性变换层', D: '减少计算资源消耗' }, answer: 'B', explanation: '多头注意力机制将 Query, Key, Value 投影到多个低维子空间进行计算，使得模型可以在不同位置同时关注不同表示子空间的信息。', showExplain: false },
    { id: 'ac5', type: 'choice', difficulty: '进阶', score: 5, title: '关于大模型的 RAG (检索增强生成) 技术，以下说法错误的是：', options: { A: 'RAG 允许模型在推理时外接企业或个人知识库', B: 'RAG 通过向量检索将外部文档切片与 Query 匹配，作为 Context 输入给 LLM', C: 'RAG 会直接修改大模型的神经网络底层权重', D: 'RAG 能有效缓解大模型出现的幻觉问题，并具有数据时效性好、成本低的特点' }, answer: 'C', explanation: 'RAG 是一种外挂知识检索手段，它通过 Prompt 上下文传递关联信息给大模型，不需要也不会修改模型参数（权重）。', showExplain: false }
  ],
  multiple: [
    { id: 'am1', type: 'multiple', difficulty: '进阶', score: 6, title: '下列关于大语言模型（LLM）微调技术的说法中，正确的有：', options: { A: 'Full Fine-Tuning 会更新模型的所有参数，计算成本高', B: 'LoRA 是一种高效参数微调技术，它只训练低秩分解矩阵', C: 'Prefix Tuning 通过在输入端插入可学习的 Virtual Tokens 来调整模型', D: '微调大模型不需要任何高质量的指令数据集' }, answer: 'A, B, C', explanation: '全量微调更新所有参数，代价极高；LoRA 通过引入低阶旁路矩阵减少可训练参数；Prefix-tuning 通过在前缀插入 prompt 向量。微调对数据质量要求高，D错误。', showExplain: false },
    { id: 'am2', type: 'multiple', difficulty: '进阶', score: 6, title: '在构建大模型检索增强生成（RAG）系统时，以下哪些步骤是必不可少的：', options: { A: '对原始知识库文档进行清洗和分块（Chunking）', B: '利用 Embedding 模型将文本切片转化为向量并存入向量数据库', C: '根据用户 Query 进行向量相似度检索召回 Top-K 切片', D: '必须重新训练大模型的全部权重参数' }, answer: 'A, B, C', explanation: 'RAG系统的典型流程包含文档清洗切片、生成Embedding存入向量库、用户提问时检索关联上下文并拼接 Prompt 输给大模型。RAG不需要重新训练大模型权重，D错误，A、B、C正确。', showExplain: false }
  ],
  completion: [
    { id: 'ak1', type: 'completion', difficulty: '基础', score: 4, title: 'BERT 采用的是双向 Transformer 编码器结构，而 GPT 采用的是自回归的 _______ 结构。', answer: '解码器 (Decoder)', explanation: 'GPT 是 Generative Pre-trained Transformer 的简称，采用单向掩码的解码器结构（Decoder-only），擅长生成任务。', showExplain: false },
    { id: 'ak2', type: 'completion', difficulty: '进阶', score: 4, title: '大模型中用来解决输入序列中位置信息丢失的编码技术称为 _______。', answer: '位置编码 (Position Encoding)', explanation: '因为 Attention 机制是词袋模型无序的，所以需要显式地通过位置编码（正余弦位置编码、旋转位置编码 RoPE 等）来向模型传入词汇的顺序信息。', showExplain: false },
    { id: 'ak3', type: 'completion', difficulty: '挑战', score: 4, title: '常见的减少大模型显存占用的模型微调技术中，LoRA 引入了 _______ 阶矩阵来近似模拟原权重的变化量。', answer: '低 (Low-Rank)', explanation: 'LoRA 核心思想是通过两个低秩矩阵的乘积来表示权重的更新量 ΔW，从而极大减少了微调时需要训练的参数量。', showExplain: false }
  ],
  judge: [
    { id: 'aj1', type: 'judge', difficulty: '基础', score: 3, title: '对于超长上下文，大模型的注意力分数会由于计算机制而面临稀释问题。（ ）', answer: '对', explanation: '随着 Context 增加，Softmax 后分配到各个 Token 的注意力权重值会被稀释，导致对部分中间内容的召回能力减弱（即 Lost in the Middle 现象）。', showExplain: false },
    { id: 'aj2', type: 'judge', difficulty: '挑战', score: 3, title: '在向量数据库检索中，Cosine Similarity（余弦相似度）只关注向量的方向，而不关注向量的绝对模长。（ ）', answer: '对', explanation: '余弦相似度公式计算的是两向量夹角的余弦值，与各自的模长大小无关，只衡量方向的一致性。', showExplain: false }
  ],
  essay: [
    { id: 'ae1', type: 'essay', difficulty: '进阶', score: 10, title: '大语言模型在回答专业性问题时经常出现“幻觉”现象。请简述什么是幻觉，并详细列出目前学术界和工业界常用来缓解幻觉的三种主流方法。', answer: '幻觉是指大模型生成看似合理、实则错误或违背客观事实的内容的现象。缓解方法主要有：\n1. RAG（检索增强生成）：在输入 Prompt 中注入相关的外部权威实时文本切片作为参考。\n2. 微调与对齐（SFT/RLHF）：通过高质量、事实性强的指令微调数据引导模型“学会说不知道”。\n3. 多 Agent 互评与 CoT（思维链）：让多个模型实例协同校验，或通过思维链让模型分步推理，降低直接推理的错误率。', showExplain: false }
  ]
}

// 模拟文档拖拽上传
const handleFileDrop = (e) => {
  isDragOver.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    uploadedFileName.value = files[0].name
    startParsing(files[0].name)
  }
}

const handleFileSelect = (uploadFile) => {
  if (uploadFile && uploadFile.name) {
    uploadedFileName.value = uploadFile.name
    startParsing(uploadFile.name)
  }
}

// 快速体验案例
const quickStart = (name) => {
  uploadedFileName.value = name
  startParsing(name)
}

// 步骤 1.5：文档解析动画模拟
const startParsing = (fileName) => {
  activeStep.value = 0.5
  parseProgress.value = 0
  
  const statusSteps = [
    { progress: 15, text: '正在进行光学字符识别 (OCR) 文本提取...' },
    { progress: 40, text: '已读取全文，正在提取核心知识点与关键词...' },
    { progress: 70, text: '核心概念分析完成，正在重构知识章节大纲...' },
    { progress: 95, text: '正在校验排版信息与文档可读性...' }
  ]

  const timer = setInterval(() => {
    parseProgress.value += 5
    
    // 更新文案
    const matchedStep = statusSteps.find(s => parseProgress.value <= s.progress)
    if (matchedStep) {
      parsingStatusText.value = matchedStep.text
    }

    if (parseProgress.value >= 100) {
      clearInterval(timer)
      completeParsing(fileName)
    }
  }, 120)
}

const completeParsing = (fileName) => {
  // 根据上传的文档类型赋不同的 Mock 数据
  if (fileName.includes('物理') || fileName.includes('牛顿')) {
    docWordsCount.value = 5240
    docKeywords.value = ['惯性定律', '牛顿第二定律', '超重与失重', '滑动摩擦力', '瞬时加速度', '经典力学体系']
    docOutline.value = [
      '第一节: 什么是惯性？牛顿第一定律阐述',
      '第二节: 力的作用效果与加速度的定量关系（F=ma）',
      '第三节: 作用力与反作用力的平衡及区别（牛顿第三定律）',
      '第四节: 生活中的力学应用：超重状态与失重状态计算'
    ]
  } else {
    // 默认大语言模型
    docWordsCount.value = 8620
    docKeywords.value = ['Transformer', 'Self-Attention', '大语言模型 (LLM)', 'RAG技术', 'Temperature', 'LoRA微调']
    docOutline.value = [
      '第一章: Transformer 核心网络架构与注意力机制机制',
      '第二章: GPT & BERT 双向/单向自回归模型对比',
      '第三章: 检索增强生成 (RAG) 知识库外挂技术实践',
      '第四章: 大模型对齐与微调（SFT / RLHF）原理',
      '第五章: 温度参数 (Temperature) 对推理随机性的调控'
    ]
  }
  // 默认全部选中章节
  selectedOutlineNodes.value = [...docOutline.value]
  checkAll.value = true
  isIndeterminate.value = false

  activeStep.value = 1
}

// 步骤 2.5：习题生成动画模拟
const generateQuestions = () => {
  if (selectedOutlineNodes.value.length === 0) {
    ElMessage.warning('请至少选择一个章节范围来生成习题！')
    return
  }
  activeStep.value = 1.5
  genProgress.value = 0
  
  const statusTexts = ['单选题', '填空题', '判断题', '简答题']
  let currentIdx = 0

  const timer = setInterval(() => {
    genProgress.value += 10
    generatingText.value = statusTexts[currentIdx]
    
    if (genProgress.value % 30 === 0 && currentIdx < statusTexts.length - 1) {
      currentIdx++
    }

    if (genProgress.value >= 100) {
      clearInterval(timer)
      completeGeneration()
    }
  }, 200)
}

// 完成题目生成
const completeGeneration = () => {
  const isPhysics = uploadedFileName.value.includes('物理') || uploadedFileName.value.includes('牛顿')
  const db = isPhysics ? physicalQuestionsDb : aiQuestionsDb
  
  const result = []

  // 按配置生成指定数量的题目
  const types = ['choice', 'multiple', 'completion', 'judge', 'essay']
  types.forEach(t => {
    const configCount = 出题配置.types[t]
    const list = db[t] || []
    
    // 取指定数量题目
    for (let i = 0; i < Math.min(configCount, list.length); i++) {
      // 深度拷贝以支持修改
      const copy = JSON.parse(JSON.stringify(list[i]))
      // 自定义单题分值覆盖
      copy.score = 出题配置.scores[t]
      result.push(copy)
    }
  })

  generatedQuestions.value = result
  activeStep.value = 2
}

// 统计习题概览
const totalQuestionsCount = computed(() => generatedQuestions.value.length)
const totalQuestionsScore = computed(() => {
  return generatedQuestions.value.reduce((sum, q) => sum + (q.score || 0), 0)
})

const getTypesCount = () => {
  const stats = { choice: 0, multiple: 0, completion: 0, judge: 0, essay: 0 }
  generatedQuestions.value.forEach(q => {
    if (stats[q.type] !== undefined) {
      stats[q.type]++
    }
  })
  return stats
}

const getTypeName = (type) => {
  const map = { choice: '单选题', multiple: '多选题', completion: '填空题', judge: '判断题', essay: '简答题' }
  return map[type] || type
}



// 单题操作逻辑
const toggleEditQuestion = (q) => {
  if (editingQuestionId.value === q.id) {
    editingQuestionId.value = null
    ElMessage.success('题干修改已保存')
  } else {
    editingQuestionId.value = q.id
  }
}

// 换一题（重新生成）
const regenerateSingleQuestion = (q) => {
  q.isRegenerating = true
  
  // 模拟 AI 生成网络延迟
  setTimeout(() => {
    const isPhysics = uploadedFileName.value.includes('物理') || uploadedFileName.value.includes('牛顿')
    const db = isPhysics ? physicalQuestionsDb : aiQuestionsDb
    const list = db[q.type] || []
    
    // 从题库中筛选一个非当前 ID 的题目替换
    const filterList = list.filter(item => item.id !== q.id)
    if (filterList.length > 0) {
      const randomQ = filterList[Math.floor(Math.random() * filterList.length)]
      const copy = JSON.parse(JSON.stringify(randomQ))
      // 自定义单题分值覆盖
      copy.score = 出题配置.scores[q.type]
      // 保留状态
      copy.showExplain = q.showExplain
      
      const idx = generatedQuestions.value.findIndex(item => item.id === q.id)
      if (idx > -1) {
        generatedQuestions.value[idx] = copy
      }
      ElMessage.success('该题已通过 AI 重新生成并替换')
    } else {
      ElMessage.info('未找到可用的替换题目，已由 AI 在线优化题干')
      q.title = '[优化版] ' + q.title
    }
    q.isRegenerating = false
  }, 1000)
}

// 删除题目
const deleteQuestion = (id) => {
  ElMessageBox.confirm('确定要删除这道题吗？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    generatedQuestions.value = generatedQuestions.value.filter(q => q.id !== id)
    ElMessage.success('已删除')
  })
}

// 添加自定义题目
const handleAddCustomQuestion = () => {
  // 初始化弹窗选项，默认选中单选题，并自动读取当前的单选题配置分数
  customQuestionForm.type = 'choice'
  customQuestionForm.score = 出题配置.scores.choice
  customQuestionDialogVisible.value = true
}

// 确认添加自定义题目
const confirmAddCustomQuestion = () => {
  const type = customQuestionForm.type
  const score = customQuestionForm.score
  const newId = 'custom-' + Date.now()

  const newQ = {
    id: newId,
    type: type,
    score: score,
    title: `请在此输入自定义的${getTypeName(type)}题干说明...`,
    answer: type === 'judge' ? '对' : (type === 'choice' || type === 'multiple' ? 'A' : '答案内容'),
    explanation: '请在此输入该题的详细逻辑解析。',
    showExplain: true
  }

  // 若为单选或多选，注入选项模板
  if (type === 'choice' || type === 'multiple') {
    newQ.options = { A: '选项 A', B: '选项 B', C: '选项 C', D: '选项 D' }
  }

  generatedQuestions.value.push(newQ)
  customQuestionDialogVisible.value = false
  
  // 自动将页面视图定位到新题编辑状态
  editingQuestionId.value = newId
  ElMessage.success(`已成功在底部添加一道自定义${getTypeName(type)}`)
}

// 一键下发
const openDispatchModal = () => {
  dispatchForm.classIds = []
  dispatchForm.endTime = ''
  dispatchForm.comment = ''
  dispatchDialogVisible.value = true
}

const confirmDispatch = () => {
  if (dispatchForm.classIds.length === 0) {
    ElMessage.error('请至少选择一个目标班级！')
    return
  }
  if (!dispatchForm.endTime) {
    ElMessage.error('请设定作业的截止提交时间！')
    return
  }

  isDispatching.value = true
  
  // 模拟发布网络请求
  setTimeout(() => {
    isDispatching.value = false
    dispatchDialogVisible.value = false
    
    // 获取下发班级的名字
    const names = appStore.classes
      .filter(c => dispatchForm.classIds.includes(c.id))
      .map(c => c.name)
      .join(', ')

    ElMessageBox.alert(
      `习题集已成功发布至以下班级：<br/><b>${names}</b><br/><br/>学生端将立刻收到微信及系统服务通知。`,
      '🎉 下发成功',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '知道了',
        type: 'success'
      }
    )
  }, 1200)
}

// 导出文档
const handleExport = (type) => {
  ElMessage.success(`正在为您排版并下载「${uploadedFileName.value.split('.')[0]}_AI配套测试题.${type.toLowerCase()}」`)
}
</script>

<style scoped>
.question-generator-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px - 48px);
  gap: 20px;
}

.card-shadow {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

/* 顶部步骤条 */
.steps-wrapper {
  padding: 24px;
}

.generator-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.step-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 步骤 1: 上传 */
.upload-step {
  justify-content: center;
  align-items: center;
}

.upload-card {
  width: 650px;
  height: 380px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2px dashed #cbd5e1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  padding: 40px;
  box-sizing: border-box;
}

.upload-card:hover, .upload-card.is-dragover {
  border-color: var(--primary-color);
  background: #f0f7ff;
}

.upload-icon-pulse {
  background: #f0f7ff;
  border-radius: 50%;
  padding: 20px;
  margin-bottom: 24px;
  transition: transform 0.3s ease;
}

.upload-card:hover .upload-icon-pulse {
  transform: scale(1.08);
}

.upload-icon {
  color: var(--primary-color);
}

.upload-card h3 {
  font-size: 20px;
  color: #1e293b;
  margin-bottom: 8px;
  font-weight: 600;
}

.upload-tip {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 28px;
}

.quick-cases {
  margin-top: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.case-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.case-tag:hover {
  background-color: var(--primary-color);
  color: white;
}

/* 解析与生成状态 */
.parsing-step {
  justify-content: center;
  align-items: center;
}

.parsing-card {
  width: 500px;
  padding: 40px;
  text-align: center;
  background: white;
}

.neural-loader {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 30px;
}

.circle {
  position: absolute;
  border: 4px solid transparent;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.circle-1 {
  top: 0; left: 0; right: 0; bottom: 0;
  animation-duration: 1.5s;
}

.circle-2 {
  top: 10px; left: 10px; right: 10px; bottom: 10px;
  border-top-color: #4096ff;
  animation-duration: 1.2s;
  animation-direction: reverse;
}

.circle-3 {
  top: 20px; left: 20px; right: 20px; bottom: 20px;
  border-top-color: #91ca7f;
  animation-duration: 0.9s;
}

.pulsing-brain {
  font-size: 48px;
  line-height: 80px;
  animation: pulse 1.2s ease-in-out infinite alternate;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.1); opacity: 1; }
}

.parsing-card h2 {
  font-size: 20px;
  color: #1e293b;
  margin-bottom: 12px;
}

.parsing-status {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 0.8s infinite alternate;
}

.progress-bar {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
  transition: width 0.15s ease-out;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
}

/* 步骤 2: 出题配置 */
.config-step {
  height: 100%;
}

.config-layout {
  display: flex;
  gap: 20px;
  height: 100%;
}

.doc-summary-card {
  flex: 2;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.config-params-card {
  flex: 3;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.header-icon {
  color: var(--primary-color);
}

.doc-meta {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-item .label {
  color: #64748b;
  width: 80px;
}

.meta-item .value {
  color: #1e293b;
  font-weight: 500;
  flex: 1;
}

.sub-title {
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
  position: relative;
  padding-left: 10px;
}

.sub-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 3px;
  background: var(--primary-color);
  border-radius: 2px;
}

.concept-section {
  margin-bottom: 24px;
}

.concept-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.outline-section {
  flex: 1;
}

.outline-tree {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.outline-node {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #475569;
}

.node-bullet {
  width: 6px;
  height: 6px;
  background: #cbd5e1;
  border-radius: 50%;
}

/* 右侧配置项表单 */
.question-types-section {
  margin-top: 24px;
  margin-bottom: 28px;
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.type-counter-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px 16px;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.type-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.type-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.generate-action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: auto;
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
}

.action-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover)) !important;
  border: 1px solid transparent !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(22, 119, 255, 0.3);
}

/* 步骤 3: 预览 */
.preview-step {
  height: 100%;
}

.preview-layout {
  display: flex;
  gap: 20px;
  height: 100%;
}

.questions-list-wrapper {
  flex: 3;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.list-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.questions-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.question-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.q-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.q-meta {
  display: flex;
  align-items: center;
}

.q-type-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.q-score {
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-color);
}

.q-title {
  font-size: 15px;
  color: #1e293b;
  line-height: 1.6;
  font-weight: 500;
}

.q-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.q-option {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid #f1f5f9;
}

.option-key {
  font-weight: 600;
  color: var(--primary-color);
}

.option-val {
  color: #334155;
}

.answer-explain-panel {
  border-top: 1px dashed #e2e8f0;
  padding-top: 12px;
}

.panel-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  user-select: none;
  width: fit-content;
}

.panel-toggle:hover {
  color: var(--primary-color);
}

.panel-content {
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.panel-content .content-item {
  display: flex;
}

.panel-content .label {
  color: #64748b;
  min-width: 70px;
}

.panel-content .value {
  color: #1e293b;
  flex: 1;
}

.bold-text {
  font-weight: 600;
  color: #10b981 !important;
}

.q-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

/* 右侧发布面板 */
.preview-sidebar-card {
  flex: 1.2;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.sidebar-intro {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 16px;
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.action-buttons-group :deep(.el-button) {
  margin-left: 0 !important;
}

.dispatch-btn {
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.3) !important;
}

.statistics-board {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.stat-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.stat-item .name {
  color: #64748b;
}

.stat-item .count {
  font-weight: 600;
  color: #1e293b;
}

.back-link-box {
  margin-top: 20px;
  text-align: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

.custom-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #f1f5f9;
  margin-right: 0;
  padding-bottom: 16px;
}

.custom-dialog :deep(.el-dialog__title) {
  font-weight: 600;
  color: #1e293b;
}

.custom-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

/* 其它工具类 */
.w-full {
  width: 100% !important;
}
.mr-1 {
  margin-right: 4px;
}
.mr-2 {
  margin-right: 8px;
}
.mb-4 {
  margin-bottom: 16px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}

/* 过渡动画 */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
