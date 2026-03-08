<template>
  <div class="page-container">
    <div class="page-header" style="align-items: center; display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div style="flex: 1;">
        <h2 style="font-size: 20px; font-weight: 600; margin: 0;">{{ ent?.name }} - 知识库集合</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-top:4px; margin-bottom:0">管理企业下属的所有知识库及文档内容</p>
      </div>
      <div>
        <el-button type="primary" @click="openCreate">+ 创建知识库</el-button>
      </div>
    </div>

    <div v-if="filteredKbs.length" class="grid">
      <div 
        v-for="k in filteredKbs" 
        :key="k.id" 
        class="card" 
        @click="goToDetail(k.id)"
      >
        <div class="title" style="display:flex; justify-content:space-between; align-items:flex-start;">
          <span>{{ k.name }}</span>
          <el-button link size="small" @click.stop="openEdit(k.id)">编辑</el-button>
        </div>
        <div class="desc" :title="k.desc">{{ k.desc }}</div>
        <div class="card-stats">
          文档数量: <b>{{ k.files.length }}</b> 
          <el-button type="primary" link size="small">详情与文档</el-button>
        </div>
      </div>
    </div>
    
    <div v-else style="padding: 40px; text-align: center; color: #888;">该主体下暂无知识库...</div>
    
    <GenericEditModal 
      v-model:visible="genericModalVisible" 
      :type="modalType" 
      :edit-id="editId" 
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore'

const router = useRouter()
const route = useRoute()
const store = useAppStore()

const entId = computed(() => route.params.entId as string)
const ent = computed(() => store.enterprises.find(e => e.id === entId.value))

const filteredKbs = computed(() => {
  return store.kbList.filter(k => k.entId === entId.value)
})

const goToDetail = (kbId: string) => {
  router.push(`/kb-detail/${entId.value}/${kbId}`)
}

import GenericEditModal from '@/components/modals/GenericEditModal.vue'
const genericModalVisible = ref(false)
const modalType = ref<'enterprise'|'kb'>('kb')
const editId = ref<string | null>(null)

const openCreate = () => {
  modalType.value = 'kb'
  editId.value = null
  genericModalVisible.value = true
}
const openEdit = (id: string) => {
  modalType.value = 'kb'
  editId.value = id
  genericModalVisible.value = true
}

const handleSuccess = (data: any) => {
  if(!editId.value) store.addKb({id: 'kb'+Date.now(), entId: entId.value, name: data.name, desc: data.desc, files: []})
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
