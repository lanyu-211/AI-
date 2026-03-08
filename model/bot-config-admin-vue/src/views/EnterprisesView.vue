<template>
  <div class="page-container">
    <div class="page-header" style="align-items: center; display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div style="flex: 1;">
        <h2 style="font-size: 20px; font-weight: 600; margin: 0;">企业管理主体</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-top:4px; margin-bottom:0">选择对应的企业主体，直接管理其下属的所有知识库</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索主体名称或描述..." 
          style="width: 220px;" 
          @keyup.enter="handleSearch"
        />
        <el-button @click="handleSearch">搜索</el-button>
        <el-button type="primary" @click="openCreate">+ 创建主体</el-button>
      </div>
    </div>

    <div v-if="filteredEnts.length" class="grid">
      <div 
        v-for="e in filteredEnts" 
        :key="e.id" 
        class="card" 
        @click="goToList(e.id)"
      >
        <div class="title" style="display:flex; justify-content:space-between; align-items:flex-start;">
          <span>{{ e.name }}</span>
          <el-button link size="small" @click.stop="openEdit(e.id)">编辑</el-button>
        </div>
        <div class="desc" :title="e.desc">{{ e.desc }}</div>
        <div class="card-stats">
          包含知识库: <b>{{ e.kbCount }}</b> 
          <span style="color:var(--primary-color)">管理资源 ></span>
        </div>
      </div>
    </div>
    
    <div v-else style="padding: 40px; text-align: center; color: #888;">没有找到匹配的主体...</div>
    
    <GenericEditModal 
      v-model:visible="genericModalVisible" 
      :type="modalType" 
      :edit-id="editId" 
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/appStore'

const router = useRouter()
const store = useAppStore()

const searchQuery = ref('')

const filteredEnts = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return store.enterprises
  return store.enterprises.filter(e => 
    e.name.toLowerCase().includes(q) || 
    e.desc.toLowerCase().includes(q)
  )
})

const handleSearch = () => {}

const goToList = (id: string) => {
  router.push(`/kb-list/${id}`)
}

import GenericEditModal from '@/components/modals/GenericEditModal.vue'
const genericModalVisible = ref(false)
const modalType = ref<'enterprise'|'kb'>('enterprise')
const editId = ref<string | null>(null)

const openCreate = () => {
  modalType.value = 'enterprise'
  editId.value = null
  genericModalVisible.value = true
}

const openEdit = (id: string) => {
  modalType.value = 'enterprise'
  editId.value = id
  genericModalVisible.value = true
}

const handleSuccess = (data: any) => {
  // handled automatically by store for edit, manually add for create
  if(!editId.value) store.addEnterprise({id: 'ent'+Date.now(), name: data.name, desc: data.desc, kbCount: 0})
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

.title { font-size: 17px; font-weight: 600; color: var(--text-main); }
.desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.card-stats { border-top: 1px solid var(--border-color); padding-top: 12px; font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; }
.card-stats b { color: var(--primary-color); }
</style>
