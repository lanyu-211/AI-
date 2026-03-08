import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ModelData {
  id: string
  name: string
  type: string
  desc: string
  key: string
  temp: number
  topP: number
  mem: number
  out: number
  kb: string[]
}

export interface EnterpriseData {
  id: string
  name: string
  desc: string
  kbCount: number
}

export interface KbData {
  id: string
  entId: string
  name: string
  desc: string
  files: string[]
}

export const useAppStore = defineStore('app', () => {
  const models = ref<ModelData[]>([
    { id: 'gpt-4', name: 'GPT-4 Global', type: 'OpenAI', desc: '全能型顶级模型，支持复杂逻辑推理', key: 'sk-proj-xxxxxx', temp:0.7, topP:1, mem:20, out:4096, kb: ['前端开发规范 2024', '企业规章库'] },
    { id: 'claude-3', name: 'Claude 3 Opus', type: 'Anthropic', desc: '长文本长上下文创作模型', key: 'ak-ant-xxxxxx', temp:1.0, topP:0.9, mem:50, out:8192, kb: [] }
  ])

  const enterprises = ref<EnterpriseData[]>([
    { id: 'e1', name: '字节跳动', desc: '全球领先的科技平台，专注于内容架构。', kbCount: 3 },
    { id: 'e2', name: '阿里巴巴', desc: '顶级电商与云计算服务，侧重云端基建。', kbCount: 2 }
  ])

  const kbList = ref<KbData[]>([
    { id: 'kb1', entId: 'e1', name: '前端开发规范 2024', desc: '统一的代码审计、组件封装及状态管理标准。', files: ['coding-style.pdf', 'api-design.md'] },
    { id: 'kb2', entId: 'e1', name: '后端系统架构', desc: '微服务、领域驱动设计及分布式架构参考。', files: ['service-mesh.pdf'] },
    { id: 'kb3', entId: 'e1', name: '企业规章库', desc: '员工手册、社保公积金及招聘流程。', files: ['manual-2024.pdf'] },
    { id: 'kb4', entId: 'e2', name: '云产品白皮书', desc: 'ECS, OSS 等产品技术规格说明书。', files: ['ecs-v5.pdf'] }
  ])

  // 操作方法
  const addModel = (model: ModelData) => {
    models.value.push(model)
  }

  const updateModel = (id: string, partial: Partial<ModelData>) => {
    const idx = models.value.findIndex(m => m.id === id)
    if(idx > -1) {
      models.value[idx] = { ...models.value[idx], ...partial }
    }
  }

  const addEnterprise = (ent: EnterpriseData) => {
    enterprises.value.push(ent)
  }

  const updateEnterprise = (id: string, name: string, desc: string) => {
    const e = enterprises.value.find(x => x.id === id)
    if(e) {
      e.name = name
      e.desc = desc
    }
  }

  const addKb = (kb: KbData) => {
    kbList.value.push(kb)
    // 更新企业知识库数量
    const ent = enterprises.value.find(e => e.id === kb.entId)
    if(ent) {
      ent.kbCount++
    }
  }

  const updateKb = (id: string, name: string, desc: string) => {
    const k = kbList.value.find(x => x.id === id)
    if(k) {
      k.name = name
      k.desc = desc
    }
  }

  const deleteKbFile = (kbId: string, fileIdx: number) => {
    const kb = kbList.value.find(k => k.id === kbId)
    if(kb) {
      kb.files.splice(fileIdx, 1)
    }
  }

  const addKbFiles = (kbId: string, files: string[]) => {
    const kb = kbList.value.find(k => k.id === kbId)
    if(kb) {
      kb.files.push(...files)
    }
  }

  return {
    models, enterprises, kbList,
    addModel, updateModel,
    addEnterprise, updateEnterprise,
    addKb, updateKb, deleteKbFile, addKbFiles
  }
})
