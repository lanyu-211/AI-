<template>
  <div class="usage-stats-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>今日 Token 消耗</template>
          <div class="stat-value">35,000</div>
          <div class="stat-delta plus">+12.5% 较昨日</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>本月预计总支出</template>
          <div class="stat-value">$128.45</div>
          <div class="stat-delta">预算剩余 65%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>活跃模型数</template>
          <div class="stat-value">12</div>
          <div class="stat-delta">系统运行正常</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>请求成功率</template>
          <div class="stat-value">99.8%</div>
          <div class="stat-delta plus">健康度极高</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="chart-card mt-20">
      <template #header>
        <div class="card-header">
          <span>Token 消耗趋势</span>
          <el-radio-group v-model="timeRange" size="small">
            <el-radio-button label="7d">近 7 天</el-radio-button>
            <el-radio-button label="30d">近 30 天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="tokenChartRef" style="height: 350px;"></div>
    </el-card>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>模型消耗排行 (Top 5)</template>
          <el-table :data="modelRanking" style="width: 100%">
            <el-table-column prop="name" label="模型名称" />
            <el-table-column prop="usage" label="Token 数" align="right" />
            <el-table-column prop="percent" label="占比" width="100">
              <template #default="{ row }">
                <el-progress :percentage="row.percent" :show-text="false" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>费用构成分析</template>
          <div ref="costChartRef" style="height: 250px;"></div>
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
const timeRange = ref('7d')
const tokenChartRef = ref<HTMLElement | null>(null)
const costChartRef = ref<HTMLElement | null>(null)

const modelRanking = ref([
  { name: 'GPT-4 Global', usage: '1.2M', percent: 45 },
  { name: 'Claude 3 Opus', usage: '850K', percent: 32 },
  { name: 'GPT-3.5 Turbo', usage: '340K', percent: 12 },
  { name: 'Llama-3-70b', usage: '120K', percent: 6 },
  { name: 'Gemini Pro', usage: '80K', percent: 5 },
])

onMounted(async () => {
  await nextTick()
  initTokenChart()
  initCostChart()
})

const initTokenChart = () => {
  if (!tokenChartRef.value) return
  const chart = echarts.init(tokenChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: appStore.usageStats.map(i => i.date)
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Tokens',
        type: 'line',
        smooth: true,
        data: appStore.usageStats.map(i => i.tokens),
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
            { offset: 1, color: 'rgba(22, 119, 255, 0)' }
          ])
        },
        itemStyle: { color: '#1677ff' }
      }
    ]
  }
  chart.setOption(option)
}

const initCostChart = () => {
  if (!costChartRef.value) return
  const chart = echarts.init(costChartRef.value)
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0', left: 'center' },
    series: [
      {
        name: '费用构成',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: [
          { value: 1048, name: 'OpenAI' },
          { value: 735, name: 'Anthropic' },
          { value: 580, name: 'Google' },
          { value: 484, name: 'Self-Hosted' }
        ]
      }
    ]
  }
  chart.setOption(option)
}
</script>

<style scoped>
.usage-stats-container {
  padding: 0;
}

.stat-card {
  border: none;
  background: white;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 10px 0;
}

.stat-delta {
  font-size: 13px;
  color: #909399;
}

.stat-delta.plus { color: #52c41a; }
.stat-delta.minus { color: #f5222d; }

.mt-20 { margin-top: 20px; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
