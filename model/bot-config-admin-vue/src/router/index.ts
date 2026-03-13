import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
// 懒加载页面视图
const MainLayout = () => import('@/layout/MainLayout.vue')
const ModelsView = () => import('@/views/ModelsView.vue')
const ModelConfigView = () => import('@/views/ModelConfigView.vue')
const EnterprisesView = () => import('@/views/EnterprisesView.vue')
const KbListView = () => import('@/views/KbListView.vue')
const KbDetailView = () => import('@/views/KbDetailView.vue')
const AiChatView = () => import('@/views/AiChatView.vue')

const routes: Array<RouteRecordRaw> = [
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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
