<template>
  <el-dialog
    v-model="dialogVisible"
    title="新增模型实例"
    width="640px"
    destroy-on-close
  >
    <el-form :model="formData" label-position="top">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="模型名称">
            <el-input v-model="formData.name" placeholder="例如: GPT-4o-Mini" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="供应商 / 类型">
            <el-select v-model="formData.type" style="width: 100%;">
              <el-option label="OpenAI" value="OpenAI" />
              <el-option label="Anthropic" value="Anthropic" />
              <el-option label="Local" value="Local" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="API Key (密钥)">
        <el-input 
          v-model="formData.key" 
          type="password" 
          show-password 
          placeholder="在此输入 API 访问秘钥" 
        />
      </el-form-item>
      
      <el-form-item label="功能描述">
        <el-input v-model="formData.desc" placeholder="简要说明其在业务中的用途" />
      </el-form-item>

      <div style="border-top:1px dashed #eee; padding-top:16px; margin-top:8px">
        <label style="color:var(--primary-color); display:block; margin-bottom: 12px; font-size:14px; font-weight:500;">初始化推理参数</label>
        <el-row :gutter="20">
          <el-col :span="12">
            <div style="margin-bottom: 8px;">
              <div style="display:flex; justify-content:space-between; font-size:13px">
                <span>生成温度</span><b>{{ formData.temp }}</b>
              </div>
              <el-slider v-model="formData.temp" :min="0" :max="2" :step="0.1" :show-tooltip="false" />
            </div>
          </el-col>
          <el-col :span="12">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px">
                <span>最大 Token</span><b>{{ formData.out }}</b>
              </div>
              <el-slider v-model="formData.out" :min="256" :max="8192" :step="256" :show-tooltip="false" />
            </div>
          </el-col>
        </el-row>
      </div>

      <div style="border-top:1px dashed #eee; padding-top:16px; margin-top:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <label style="color:var(--primary-color); margin:0; font-size:14px; font-weight:500;">默认知识库关联</label>
          <el-button link size="small" @click="openMountModal">+ 选择库</el-button>
        </div>
        
        <div class="kb-list">
          <template v-if="formData.kb && formData.kb.length">
            <div class="kb-item" v-for="(k, idx) in formData.kb" :key="idx">
              <span>{{ k }}</span>
              <el-button link type="danger" size="small" @click="formData.kb && formData.kb.splice(idx,1)">移除</el-button>
            </div>
          </template>
          <div v-else style="padding: 16px; text-align: center; color: #bfbfbf; font-size:13px;">
            暂未绑定任何知识集合
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close">取消</el-button>
        <el-button type="primary" @click="confirm">完成并入库</el-button>
      </div>
    </template>
    
    <!-- 内嵌一个挂载资源的弹窗 -->
    <MountKbModal 
      v-model:visible="mountVisible" 
      :initial-selected="formData.kb"
      @confirm="handleMountConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { ElMessage } from 'element-plus'
import MountKbModal from './MountKbModal.vue'

const props = defineProps({
  visible: Boolean
})
const emit = defineEmits(['update:visible'])
const store = useAppStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formData = ref({})
const mountVisible = ref(false)

watch(() => props.visible, (val) => {
  if (val) {
    formData.value = {
      name: '',
      type: 'OpenAI',
      key: '',
      desc: '',
      temp: 0.7,
      topP: 1.0,
      mem: 20,
      out: 2048,
      kb: []
    }
  }
})

const openMountModal = () => { mountVisible.value = true }

const handleMountConfirm = (kbs) => {
  if(formData.value) formData.value.kb = kbs
}

const close = () => { dialogVisible.value = false }

const confirm = () => {
  if (!formData.value.name || !formData.value.key) {
    ElMessage.warning('名称和密钥必填')
    return
  }
  
  store.addModel({
    ...formData.value,
    id: 'm-' + Date.now()
  })
  
  ElMessage.success('模型已就位')
  close()
}
</script>

<style scoped>
.kb-list { border: 1px solid var(--border-color); border-radius: var(--radius); }
.kb-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border-color); font-size: 14px; }
.kb-item:last-child { border-bottom: none; }
</style>
