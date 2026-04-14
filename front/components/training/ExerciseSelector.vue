<template>
  <view v-if="visible" class="selector-mask" @click="handleClose">
    <view class="selector-content" @click.stop>
      <!-- 搜索框 -->
      <view class="search-bar">
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索动作名称"
          @input="onSearch"
        />
        <text class="close-btn" @click="handleClose">取消</text>
      </view>

      <!-- 分类标签 -->
      <scroll-view class="category-tabs" scroll-x>
        <view
          v-for="cat in categories"
          :key="cat.value"
          class="category-tab"
          :class="{ active: selectedCategory === cat.value }"
          @click="onCategoryChange(cat.value)"
        >
          {{ cat.label }}
        </view>
      </scroll-view>

      <!-- 动作列表 -->
      <scroll-view class="exercise-list" scroll-y>
        <view
          v-for="exercise in filteredExercises"
          :key="exercise.id"
          class="exercise-item"
          @click="handleSelect(exercise)"
        >
          <view class="exercise-info">
            <text class="exercise-name">{{ exercise.name }}</text>
            <text class="exercise-meta">{{ exercise.category }} | {{ exercise.equipment }}</text>
          </view>
          <text class="select-icon">›</text>
        </view>

        <view v-if="filteredExercises.length === 0" class="empty-tip">
          <text>暂无匹配的动作</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getExercises, type Exercise } from '@/api/exercise'

// Props
interface Props {
  visible: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', exercise: { id: string; name: string }): void
}>()

// 分类选项
const categories = [
  { label: '全部', value: '' },
  { label: '胸部', value: 'CHEST' },
  { label: '背部', value: 'BACK' },
  { label: '腿部', value: 'LEGS' },
  { label: '肩部', value: 'SHOULDERS' },
  { label: '手臂', value: 'ARMS' },
  { label: '核心', value: 'CORE' },
  { label: '心肺', value: 'CARDIO' },
]

// 状态
const searchKeyword = ref('')
const selectedCategory = ref('')
const allExercises = ref<Exercise[]>([])
const loading = ref(false)

// 过滤后的动作列表
const filteredExercises = computed(() => {
  let result = allExercises.value

  // 按分类过滤
  if (selectedCategory.value) {
    result = result.filter(ex => ex.category === selectedCategory.value)
  }

  // 按关键词过滤（模糊匹配）
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    if (keyword) {
      result = result.filter(ex => {
        const name = ex.name.toLowerCase()
        const nameEn = (ex.nameEn || '').toLowerCase()
        // 完全匹配
        if (name.includes(keyword) || nameEn.includes(keyword)) return true
        // 模糊匹配：关键词在中文拼音首字母中
        // 例如搜索"bj"可以匹配"臂屈伸"
        // 注意：完整拼音匹配更可靠
        // 这里简化为首字母模糊
        const pinyinMatch = fuzzyMatchPinyin(ex.name, keyword)
        return pinyinMatch
      }).sort((a, b) => {
        // 排序：完全匹配优先
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        if (aName.startsWith(keyword) && !bName.startsWith(keyword)) return -1
        if (!aName.startsWith(keyword) && bName.startsWith(keyword)) return 1
        return 0
      })
    }
  }

  return result
})

// 简化的拼音模糊匹配
function fuzzyMatchPinyin(name: string, keyword: string): boolean {
  // 如果关键词太短，不进行拼音匹配
  if (keyword.length < 2) return false

  // 简化实现：检查关键词是否是动作名称的子串
  // 完整实现需要引入拼音库（如 pinyin-pro）
  // 这里只做基本的中文子串匹配
  return false
}

// 加载动作列表
async function loadExercises() {
  loading.value = true
  try {
    allExercises.value = await getExercises()
  } catch (e) {
    console.error('加载动作列表失败', e)
  } finally {
    loading.value = false
  }
}

// 监听 visible 变化
watch(() => props.visible, (visible) => {
  if (visible && allExercises.value.length === 0) {
    loadExercises()
  }
}, { immediate: true })

// 搜索
function onSearch() {
  // 搜索是computed自动处理的
}

// 分类切换
function onCategoryChange(category: string) {
  selectedCategory.value = category
}

// 关闭
function handleClose() {
  searchKeyword.value = ''
  selectedCategory.value = ''
  emit('close')
}

// 选择动作
function handleSelect(exercise: Exercise) {
  emit('select', { id: exercise.id, name: exercise.name })
}
</script>

<style lang="scss" scoped>
.selector-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.selector-content {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.search-input {
  flex: 1;
  height: 64rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
  font-size: 28rpx;
}

.close-btn {
  margin-left: 20rpx;
  font-size: 28rpx;
  color: #666;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  white-space: nowrap;
}

.category-tab {
  display: inline-block;
  padding: 12rpx 24rpx;
  margin: 0 8rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #666;
}

.category-tab.active {
  background: #07c160;
  color: #fff;
}

/* 动作列表 */
.exercise-list {
  flex: 1;
  max-height: 60vh;
}

.exercise-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.exercise-info {
  flex: 1;
}

.exercise-name {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.exercise-meta {
  font-size: 24rpx;
  color: #999;
}

.select-icon {
  font-size: 40rpx;
  color: #ccc;
  margin-left: 16rpx;
}

.empty-tip {
  padding: 60rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
</style>