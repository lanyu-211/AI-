<template>
  <el-container class="app-wrapper">
    <!-- 左侧边栏 -->
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <el-icon color="#1677ff" :size="20"><Location /></el-icon>
        AI 管理后台
      </div>
      <el-menu
        :default-active="activeMenu"
        class="nav-menu"
        background-color="transparent"
        text-color="rgba(255, 255, 255, 0.65)"
        active-text-color="#fff"
        router
      >
        <el-sub-menu index="ai-chat-group">
          <template #title>
            <span>官网智能客服</span>
          </template>
          <el-menu-item index="/ai-chat">
            <span>智能客服后台</span>
          </el-menu-item>
          <el-menu-item index="/models">
            <span>客服模型配置</span>
          </el-menu-item>
          <el-menu-item index="/kb-list/e1">
            <span>智能客服知识库管理</span>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/doc-analysis">
          <span>文档分析</span>
        </el-menu-item>
        <el-menu-item index="/question-generator">
          <span>智能出题</span>
        </el-menu-item>

      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部 Header -->
      <el-header class="header">
        <div class="breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(item, idx) in breadcrumbs" :key="idx" :to="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="user-info">系统管理员</div>
      </el-header>

      <!-- 主体内容 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Location } from '@element-plus/icons-vue' // 只是作为标志代替原生的 svg
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const appStore = useAppStore()

// 侧边栏高亮逻辑
const activeMenu = computed(() => {
  if (route.path.startsWith('/model')) return '/models'
  if (route.path.startsWith('/kb') || route.path.startsWith('/enterprise')) return '/kb-list/e1'
  return route.path
})

// 动态面包屑逻辑
const breadcrumbs = computed(() => {
  const pathArr = []

  if (route.path.startsWith('/model-config')) {
    pathArr.push({ title: '官网智能客服' })
    pathArr.push({ title: '客服模型配置', path: '/models' })
    pathArr.push({ title: '详情参数配置' })
  } else if (route.path.startsWith('/models')) {
    pathArr.push({ title: '官网智能客服' })
    pathArr.push({ title: '客服模型配置' })
  } else if (route.path.startsWith('/kb') || route.path.startsWith('/enterprises')) {
    pathArr.push({ title: '官网智能客服' })
    
    if (route.path.startsWith('/kb-list')) {
      pathArr.push({ title: '智能客服知识库管理' })
    } else if (route.path.startsWith('/kb-detail')) {
      pathArr.push({ title: '智能客服知识库管理', path: '/kb-list/e1' })
      const kbId = route.params.kbId
      const kb = appStore.kbList.find(k => k.id === kbId)
      if (kb) pathArr.push({ title: kb.name })
    } else {
      pathArr.push({ title: '智能客服知识库管理' })
    }
  } else if (route.path.startsWith('/ai-chat')) {
    pathArr.push({ title: '官网智能客服' })
    pathArr.push({ title: '智能客服后台' })
  } else if (route.path.startsWith('/doc-analysis')) {
    pathArr.push({ title: '文档分析' })
  } else if (route.path.startsWith('/question-generator')) {
    pathArr.push({ title: '智能出题' })
  }


  return pathArr
})
</script>

<style scoped>
.app-wrapper {
  height: 100%;
  width: 100%;
}

.sidebar {
  background-color: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 20px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
}

.nav-menu {
  border-right: none;
}

:deep(.el-menu-item.is-active) {
  background-color: var(--primary-color) !important;
  color: white !important;
}
:deep(.el-menu-item:hover) {
  color: white !important;
}

.header {
  height: 64px;
  background: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 10;
}

.user-info {
  font-size: 14px;
}

.main-content {
  background-color: var(--bg-body);
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 过渡动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
