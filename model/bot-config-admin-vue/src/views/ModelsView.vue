<template>
  <div class="page-container">
    <div class="page-header" style="align-items: center; display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div style="flex: 1;">
        <h2 style="font-size: 20px; font-weight: 600; margin: 0;">模型场景管理</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-top:4px; margin-bottom:0">配置不同业务场景下 AI 助手的系统人设、API 密钥与关联专属知识库</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索助手名称或描述..." 
          style="width: 220px;" 
          @keyup.enter="handleSearch"
        />
        <el-button @click="handleSearch">搜索</el-button>
        <el-button type="primary" @click="openNewModel">+ 新增场景助手</el-button>
      </div>
    </div>

    <div v-if="filteredModels.length" class="grid">
      <div 
        v-for="m in filteredModels" 
        :key="m.id" 
        class="card" 
        data-pinmark="model-item-card"
        @click="goToDetail(m.id)"
      >
        <span class="tag tag-blue">{{ m.type }}</span>
        <div class="title">{{ m.name }}</div>
        <div class="desc" :title="m.desc">{{ m.desc }}</div>
        <div class="card-stats">
          关联库: <b>{{ m.kb.length }}</b> 
          <el-button link size="small">配置详情</el-button>
        </div>
      </div>
    </div>
    
    <div v-else style="padding: 40px; text-align: center; color: #888;">没有找到匹配的模型...</div>
    
    <ModelEditModal v-model:visible="modelModalVisible" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/appStore'

const router = useRouter()
const store = useAppStore()

const searchQuery = ref('')

const filteredModels = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return store.models
  return store.models.filter(m => 
    m.name.toLowerCase().includes(q) || 
    m.desc.toLowerCase().includes(q) || 
    m.type.toLowerCase().includes(q)
  )
})

const handleSearch = () => {
  // trigger layout update already handled by computed
}

import ModelEditModal from '@/components/modals/ModelEditModal.vue'
const modelModalVisible = ref(false)

const openNewModel = () => {
  modelModalVisible.value = true
}

const goToDetail = (id) => {
  router.push(`/model-config/${id}`)
}
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
.card {
  background: white; border-radius: var(--radius); padding: 24px;
  border: 1px solid var(--border-color); transition: var(--transition);
  cursor: pointer; display: flex; flex-direction: column; gap: 12px; position: relative;
}
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--primary-color); }

.tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #f5f5f5; color: #666; width: fit-content; text-transform: uppercase; font-weight: 600; }
.tag-blue { background: #e6f7ff; color: #1890ff; }
.title { font-size: 17px; font-weight: 600; color: var(--text-main); }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.card-stats { border-top: 1px solid var(--border-color); padding-top: 12px; font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; }
.card-stats b { color: var(--primary-color); }
</style>
