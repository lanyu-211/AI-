import { createRouter, createWebHistory } from 'vue-router'
// 懒加载页面视图
const MainLayout = () => import('@/layout/MainLayout.vue')
const ModelsView = () => import('@/views/ModelsView.vue')
const ModelConfigView = () => import('@/views/ModelConfigView.vue')
const EnterprisesView = () => import('@/views/EnterprisesView.vue')
const KbListView = () => import('@/views/KbListView.vue')
const KbDetailView = () => import('@/views/KbDetailView.vue')
const AiChatView = () => import('@/views/AiChatView.vue')
const UsageStatsView = () => import('@/views/UsageStatsView.vue')
const PerfMonitorView = () => import('@/views/PerfMonitorView.vue')
const DocAnalysisView = () => import('@/views/DocAnalysisView.vue')


const routes = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/models',
    children: [
      {
        path: 'models',
        name: 'Models',
        component: ModelsView,
        meta: { title: '大模型管理' }
      },
      {
        path: 'model-config/:id',
        name: 'ModelConfig',
        component: ModelConfigView,
        meta: { title: '详情参数配置' }
      },
      {
        path: 'enterprises',
        name: 'Enterprises',
        component: EnterprisesView,
        meta: { title: '企业管理主体' }
      },
      {
        path: 'kb-list/:entId',
        name: 'KbList',
        component: KbListView,
        meta: { title: '库项集合' }
      },
      {
        path: 'kb-detail/:entId/:kbId',
        name: 'KbDetail',
        component: KbDetailView,
        meta: { title: '知识库详情' }
      },
      {
        path: 'ai-chat',
        name: 'AiChat',
        component: AiChatView,
        meta: { title: 'AI 模型对话' }
      },
      {
        path: 'usage',
        name: 'UsageStats',
        component: UsageStatsView,
        meta: { title: '统计报表' }
      },
      {
        path: 'monitor',
        name: 'PerfMonitor',
        component: PerfMonitorView,
        meta: { title: '性能监控' }
      },
      {
        path: 'doc-analysis',
        name: 'DocAnalysis',
        component: DocAnalysisView,
        meta: { title: '文档分析' }
      }

    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
