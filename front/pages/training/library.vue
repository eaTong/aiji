<template>
  <view class="container">
    <!-- Search Bar -->
    <view class="search-bar">
      <input
        class="search-input"
        placeholder="搜索动作名称"
        v-model="keyword"
        @input="onSearch"
      />
    </view>

    <!-- Category Tabs -->
    <scroll-view class="category-tabs" scroll-x enable-flex>
      <view
        v-for="tab in categoryTabs"
        :key="tab.value"
        :class="['tab-item', { active: selectedCategory === tab.value }]"
        @tap="onTabChange(tab.value)"
      >
        {{ tab.label }}
      </view>
    </scroll-view>

    <!-- Exercise List -->
    <scroll-view class="exercise-list" scroll-y @scrolltolower="loadMore">
      <view
        v-for="item in exercises"
        :key="item.id"
        class="exercise-item"
        @tap="goDetail(item.id)"
      >
        <view class="exercise-main">
          <text class="exercise-name">{{ item.name }}</text>
          <view class="exercise-meta">
            <text class="meta-tag category-tag">{{ catLabels[item.category] }}</text>
            <text class="meta-tag equipment-tag">{{ equipLabels[item.equipment] }}</text>
          </view>
        </view>
        <view class="muscle-tags">
          <text
            v-for="muscle in item.primaryMuscles"
            :key="muscle"
            class="muscle-tag"
          >{{ muscle }}</text>
        </view>
      </view>

      <view v-if="exercises.length === 0 && !loading" class="empty-tip">
        <text>暂无动作</text>
      </view>

      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getExercises, type Exercise } from '../../api/exercise'

const catLabels: Record<string, string> = {
  CHEST: '胸部',
  BACK: '背部',
  LEGS: '腿部',
  SHOULDERS: '肩部',
  ARMS: '手臂',
  CORE: '核心',
  CARDIO: '有氧',
}

const equipLabels: Record<string, string> = {
  BARBELL: '杠铃',
  DUMBBELL: '哑铃',
  CABLE: '绳索',
  MACHINE: '器械',
  BODYWEIGHT: '自重',
}

const categoryTabs = [
  { label: '全部', value: '' },
  { label: '胸部', value: 'CHEST' },
  { label: '背部', value: 'BACK' },
  { label: '腿部', value: 'LEGS' },
  { label: '肩部', value: 'SHOULDERS' },
  { label: '手臂', value: 'ARMS' },
  { label: '核心', value: 'CORE' },
  { label: '有氧', value: 'CARDIO' },
]

const keyword = ref('')
const selectedCategory = ref('')
const exercises = ref<Exercise[]>([])
const loading = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchExercises()
  }, 300)
}

function onTabChange(category: string) {
  selectedCategory.value = category
  fetchExercises()
}

async function fetchExercises() {
  loading.value = true
  try {
    exercises.value = await getExercises({
      category: selectedCategory.value || undefined,
      keyword: keyword.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/training/exercise-detail?id=${id}` })
}

onMounted(() => {
  fetchExercises()
})
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  padding: 24rpx 24rpx 16rpx;
  background: #fff;
}

.search-input {
  background: #f0f0f0;
  border-radius: 32rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
}

.category-tabs {
  display: flex;
  white-space: nowrap;
  background: #fff;
  padding: 0 16rpx 16rpx;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  display: inline-block;
  padding: 12rpx 24rpx;
  font-size: 28rpx;
  color: #666;
  margin-right: 16rpx;
  border-radius: 32rpx;
  flex-shrink: 0;
}

.tab-item.active {
  background: #333;
  color: #fff;
}

.exercise-list {
  flex: 1;
  padding: 24rpx;
}

.exercise-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.exercise-main {
  margin-bottom: 16rpx;
}

.exercise-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.exercise-meta {
  display: flex;
  gap: 12rpx;
}

.meta-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.category-tag {
  background: #e8f0fe;
  color: #1a73e8;
}

.equipment-tag {
  background: #f0f0f0;
  color: #666;
}

.muscle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.muscle-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  background: #fff3e0;
  color: #e65100;
  border-radius: 8rpx;
}

.empty-tip,
.loading-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>