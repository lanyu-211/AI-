<template>
  <el-dialog
    v-model="dialogVisible"
    title="挂载知识库资源"
    width="720px"
    destroy-on-close
  >
    <div style="margin-bottom: 16px;">
      <el-input 
        v-model="searchQuery" 
        placeholder="搜索知识库名称或描述..." 
        clearable 
      />
    </div>

    <div class="split-container">
      <!-- 左侧：企业主体 -->
      <div class="ent-list">
        <div 
          v-for="e in store.enterprises" 
          :key="e.id"
          :class="['ent-list-item', currentEntId === e.id ? 'active' : '']"
          @click="currentEntId = e.id"
        >
          {{ e.name }}
        </div>
      </div>
      <!-- 右侧：知识库列表 -->
      <div class="kb-list">
        <template v-if="filteredKbs.length">
          <div 
            v-for="k in filteredKbs" 
            :key="k.id"
            :class="['mount-kb-card', selectedKbs.has(k.name) ? 'selected' : '']"
            @click="toggleSelect(k.name)"
          >
            <div style="flex: 1; padding-right: 12px;">
              <div class="title">{{ k.name }}</div>
              <div class="desc" :title="k.desc">{{ k.desc }}</div>
            </div>
            <el-checkbox :model-value="selectedKbs.has(k.name)" @click.stop.prevent="toggleSelect(k.name)" />
          </div>
        </template>
        <div v-else style="padding: 24px; text-align: center; color: #bfbfbf; font-size: 13px;">
          没有找到符合条件的知识库
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close">取消</el-button>
        <el-button type="primary" @click="confirm">
          确认挂载 ({{ selectedKbs.size }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/appStore'

const props = defineProps({
  visible: Boolean,
  initialSelected: Array
})

const emit = defineEmits(['update:visible', 'confirm'])
const store = useAppStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const searchQuery = ref('')
const currentEntId = ref('')
const selectedKbs = ref(new Set())

watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = ''
    selectedKbs.value = new Set(props.initialSelected || [])
    if (store.enterprises.length > 0) {
      currentEntId.value = store.enterprises[0].id
    }
  }
})

const filteredKbs = computed(() => {
  let list = store.kbList.filter(k => k.entId === currentEntId.value)
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    list = list.filter(k => k.name.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q))
  }
  return list
})

const toggleSelect = (name) => {
  if (selectedKbs.value.has(name)) {
    selectedKbs.value.delete(name)
  } else {
    selectedKbs.value.add(name)
  }
}

const close = () => { dialogVisible.value = false }
const confirm = () => {
  emit('confirm', Array.from(selectedKbs.value))
  close()
}
</script>

<style scoped>
.split-container {
  display: flex; 
  border: 1px solid var(--border-color); 
  border-radius: var(--radius); 
  overflow: hidden; 
  min-height: 340px; 
  max-height: 480px;
}

.ent-list {
  width: 200px; 
  background: #f5f7fa; 
  border-right: 1px solid var(--border-color); 
  overflow-y: auto;
}

.ent-list-item { 
  padding: 14px 16px; cursor: pointer; font-size: 14px; 
  transition: var(--transition); border-bottom: 1px solid #eef0f4; color: #5c5c5c; 
  border-left: 3px solid transparent;
}
.ent-list-item:hover { background: #eef2f9; color: var(--text-main); }
.ent-list-item.active { 
  background: white; 
  color: var(--primary-color); 
  font-weight: 600; 
  border-left: 3px solid var(--primary-color); 
  border-right: 1px solid white;
  margin-right: -1px; /* 覆盖右侧边框制造连通感 */
}

.kb-list {
  flex: 1; overflow-y: auto; padding: 16px; background: #fff;
}

.mount-kb-card { 
  padding: 12px 16px; 
  border: 1px solid #dcdfe6; 
  border-radius: var(--radius); 
  margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; 
  transition: var(--transition); 
  background: #ffffff;
}
.mount-kb-card:hover { border-color: #c0c4cc; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.mount-kb-card.selected { 
  border-color: var(--primary-color); 
  background: #f0f7ff; 
  box-shadow: 0 0 0 1px var(--primary-color) inset; 
}

.title { font-size: 14px; margin-bottom: 4px; }
.desc { font-size: 12px; color: var(--text-secondary); -webkit-line-clamp: 1; line-clamp: 1; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }
</style>
