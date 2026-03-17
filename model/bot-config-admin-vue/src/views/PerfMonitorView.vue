<template>
  <div class="perf-monitor-container">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>平均响应延迟 (Latency)</span>
              <el-tag type="success">实时监控中</el-tag>
            </div>
          </template>
          <div ref="latencyChartRef" style="height: 300px;"></div>
        </el-card>

        <el-card shadow="never" class="mt-20">
          <template #header>对话质量 Bad Cases 收集</template>
          <el-table :data="appStore.badCases" stripe style="width: 100%">
            <el-table-column prop="time" label="时间" width="160" />
            <el-table-column prop="model" label="模型" width="120" />
            <el-table-column prop="query" label="提问" show-overflow-tooltip />
            <el-table-column prop="feedback" label="反馈" width="100">
              <template #default="{ row }">
                <el-tag :type="row.feedback === 'up' ? 'success' : 'danger'">
                  {{ row.feedback === 'up' ? '满意' : '不满意' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default>
                <el-button link type="primary">查看链路</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="never">
          <template #header>服务可用性 (SLA)</template>
          <div class="sla-progress">
            <el-progress type="dashboard" :percentage="99.98" :color="colors" />
            <div class="sla-label">过去 30 天可用性</div>
          </div>
          <el-divider />
          <div class="sla-info">
            <p><span>核心 API</span> <el-tag size="small">运行中</el-tag></p>
            <p><span>向量数据库</span> <el-tag size="small">运行中</el-tag></p>
            <p><span>消息队列</span> <el-tag size="small" type="warning">波动</el-tag></p>
          </div>
        </el-card>

        <el-card shadow="never" class="mt-20">
          <template #header>错误分类统计</template>
          <div ref="errorChartRef" style="height: 250px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()
const latencyChartRef = ref<HTMLElement | null>(null)
const errorChartRef = ref<HTMLElement | null>(null)

const colors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 40 },
  { color: '#5cb87a', percentage: 60 },
  { color: '#1989fa', percentage: 80 },
  { color: '#6f7ad3', percentage: 100 },
]

onMounted(async () => {
  await nextTick()
  initLatencyChart()
  initErrorChart()
})

const initLatencyChart = () => {
  if (!latencyChartRef.value) return
  const chart = echarts.init(latencyChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: appStore.latencyStats.map(i => i.time) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value} s' } },
    series: [{
      data: appStore.latencyStats.map(i => i.value),
      type: 'bar',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      },
    }]
  }
  chart.setOption(option)
}

const initErrorChart = () => {
  if (!errorChartRef.value) return
  const chart = echarts.init(errorChartRef.value)
  const option = {
    radar: {
      indicator: [
        { name: '401 无效秘钥', max: 100 },
        { name: '429 访问受限', max: 100 },
        { name: '500 服务器错误', max: 100 },
        { name: '超时异常', max: 100 },
        { name: '内容合规拦截', max: 100 }
      ]
    },
    series: [{
      name: '错误统计',
      type: 'radar',
      data: [{ value: [20, 45, 10, 30, 15], name: '错误分布' }],
      areaStyle: { color: 'rgba(255, 153, 0, 0.3)' },
      lineStyle: { color: '#ff9900' }
    }]
  }
  chart.setOption(option)
}
</script>

<style scoped>
.perf-monitor-container {
  padding: 0;
}

.mt-20 { margin-top: 20px; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sla-progress {
  text-align: center;
  padding: 20px 0;
}

.sla-label {
  margin-top: 10px;
  color: #909399;
  font-size: 14px;
}

.sla-info p {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  font-size: 14px;
  color: #606266;
}
</style>
