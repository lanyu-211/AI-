<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="480px"
    destroy-on-close
  >
    <el-form label-position="top">
      <el-form-item :label="nameLabel">
        <el-input v-model="mName" />
      </el-form-item>
      <el-form-item label="详细描述">
        <el-input v-model="mDesc" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close">取消</el-button>
        <el-button type="primary" @click="confirm">确认提交</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
  type: 'enterprise' | 'kb'
  editId: string | null
}>()

const emit = defineEmits(['update:visible', 'success'])
const store = useAppStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const title = computed(() => {
  if (props.type === 'enterprise') return props.editId ? '编辑企业主体' : '新增企业主体'
  return props.editId ? '编辑知识库' : '创建知识库'
})

const nameLabel = computed(() => props.type === 'enterprise' ? '企业全称' : '库名称')

const mName = ref('')
const mDesc = ref('')

watch(() => props.visible, (val) => {
  if (val) {
    if (props.editId) {
      const dataList = props.type === 'enterprise' ? store.enterprises : store.kbList
      const item = dataList.find(x => x.id === props.editId)
      if (item) {
        mName.value = item.name
        mDesc.value = item.desc
      }
    } else {
      mName.value = ''
      mDesc.value = ''
    }
  }
})

const close = () => { dialogVisible.value = false }

const confirm = () => {
  if (!mName.value.trim()) {
    ElMessage.warning('名称不能为空')
    return
  }

  if (props.editId) {
    if (props.type === 'enterprise') {
      store.updateEnterprise(props.editId, mName.value, mDesc.value)
    } else {
      store.updateKb(props.editId, mName.value, mDesc.value)
    }
    ElMessage.success('信息修改成功')
  } else {
    emit('success', { name: mName.value, desc: mDesc.value })
    ElMessage.success('已申请录入')
  }

  close()
}
</script>
