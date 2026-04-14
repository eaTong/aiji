<template>
  <view class="record-card">
    <!-- 卡片头部 -->
    <view class="card-header">
      <text class="card-title">💪 训练记录</text>
      <text class="help-icon" @click="showHelp">?</text>
    </view>

    <!-- 日期和训练类型 -->
    <view class="basic-info">
      <view class="info-row">
        <text class="info-label">📅 日期</text>
        <picker mode="date" :value="formData.date" @change="onDateChange">
          <text class="info-value">{{ formData.date }}</text>
        </picker>
      </view>
      <view class="info-row">
        <text class="info-label">🏷️ 训练类型</text>
        <input
          class="info-input"
          v-model="formData.trainingType"
          placeholder="如：胸部训练"
        />
      </view>
    </view>

    <!-- 动作列表 -->
    <view class="exercises-section">
      <view class="section-header">
        <text class="section-title">动作</text>
      </view>

      <!-- 表头 -->
      <view class="table-header">
        <text class="col-name">动作</text>
        <text class="col-sets">组数</text>
        <text class="col-reps">次数</text>
        <text class="col-weight">重量</text>
        <text class="col-warmup">热身</text>
        <text class="col-action">操作</text>
      </view>

      <!-- 动作行（支持滑动删除） -->
      <view
        v-for="(exercise, exIdx) in formData.exercises"
        :key="exIdx"
        class="exercise-row-wrapper"
        @touchstart="onTouchStart($event, exIdx)"
        @touchmove="onTouchMove($event, exIdx)"
        @touchend="onTouchEnd(exIdx)"
      >
        <view
          class="exercise-row"
          :class="{ 'is-warmup': hasWarmupOnly(exercise), 'swiped': swipingIndex === exIdx }"
        >
        <!-- 动作名称 -->
        <view class="col-name" @click="openExerciseSelector(exIdx)">
          <text class="exercise-name">{{ exercise.exerciseName || '选择动作' }}</text>
          <text v-if="hasWarmupOnly(exercise)" class="warmup-tag">(热身)</text>
        </view>

        <!-- 组数 -->
        <view class="col-sets">
          <input
            class="num-input"
            type="number"
            v-model="exercise.sets"
            @blur="onSetsChange(exIdx)"
          />
        </view>

        <!-- 次数 -->
        <view class="col-reps">
          <input
            class="num-input"
            type="number"
            v-model="exercise.reps"
            @blur="onRepsChange(exIdx)"
          />
        </view>

        <!-- 重量 -->
        <view class="col-weight">
          <input
            class="num-input weight-input"
            type="number"
            v-model="exercise.weight"
            placeholder="0"
            @blur="onWeightChange(exIdx)"
          />
          <text class="unit">kg</text>
        </view>

        <!-- 热身 -->
        <view class="col-warmup">
          <view
            class="warmup-toggle"
            :class="{ active: exercise.isWarmup }"
            @click="toggleWarmup(exIdx)"
          >
            <text>{{ exercise.isWarmup ? '●' : '○' }}</text>
          </view>
        </view>

        <!-- 操作 -->
        <view class="col-action">
          <text class="delete-btn" @click="removeExercise(exIdx)">删除</text>
        </view>
      </view>

      <!-- 滑动删除操作 -->
      <view class="swipe-action">
        <text class="swipe-delete" @click="removeExercise(exIdx)">删除</text>
      </view>
      </view>

      <!-- 添加动作按钮 -->
      <view class="add-exercise-btn" @click="openExerciseSelector(-1)">
        <text class="add-icon">+</text>
        <text>添加动作</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="notes-section">
      <text class="section-title">备注</text>
      <textarea
        class="notes-input"
        v-model="formData.notes"
        placeholder="状态不错，力量有提升..."
        maxlength="200"
      />
    </view>

    <!-- 底部按钮 -->
    <view class="card-footer">
      <button class="btn-cancel" @click="handleCancel">取消</button>
      <button class="btn-save" @click="handleSave">保存记录</button>
    </view>

    <!-- 动作选择器弹窗 -->
    <ExerciseSelector
      v-if="showExerciseSelector"
      :visible="showExerciseSelector"
      @close="showExerciseSelector = false"
      @select="onExerciseSelect"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import ExerciseSelector from './ExerciseSelector.vue'
import { saveTrainingRecord, type ExerciseSet, type SaveRecordResponse } from '@/api/training'

// Props
interface Props {
  initialData?: {
    date?: string
    trainingType?: string
    exercises?: ExerciseSet[]
    notes?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({})
})

// Emits
const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', result: SaveRecordResponse): void
}>()

// 日期格式化
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 表单数据
const formData = reactive({
  date: props.initialData.date || formatDate(new Date()),
  trainingType: props.initialData.trainingType || '',
  exercises: props.initialData.exercises || [],
  notes: props.initialData.notes || '',
})

// 动作选择器状态
const showExerciseSelector = ref(false)
const currentExerciseIndex = ref(-1)

// 动作选择器回调
function openExerciseSelector(index: number) {
  currentExerciseIndex.value = index
  showExerciseSelector.value = true
}

function onExerciseSelect(exercise: { id: string; name: string }) {
  if (currentExerciseIndex.value === -1) {
    // 新增动作
    formData.exercises.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: 3,
      reps: 10,
      weight: 0,
      isWarmup: false,
    })
  } else {
    // 更新现有动作
    formData.exercises[currentExerciseIndex.value].exerciseId = exercise.id
    formData.exercises[currentExerciseIndex.value].exerciseName = exercise.name
  }
  showExerciseSelector.value = false
}

// ============ 热身组自动判断逻辑 ============
// 判断规则：
// 规则1：第一组 + 重量 < 历史最大重量50% → 热身组
// 规则2：第一组 + 次数 > 15 → 热身组
// 规则3：重量 < 历史最大重量30% → 热身组

interface WarmupRuleResult {
  isWarmup: boolean
  reason: string
}

function autoDetectWarmup(exercise: ExerciseSet, maxHistoricalWeight: number): WarmupRuleResult {
  // 规则1：重量低于历史最大重量50%
  if (maxHistoricalWeight > 0 && exercise.weight < maxHistoricalWeight * 0.5) {
    return { isWarmup: true, reason: '重量低于历史最大重量的50%' }
  }

  // 规则2：次数超过15次
  if (exercise.reps > 15) {
    return { isWarmup: true, reason: '次数超过15次' }
  }

  // 规则3：重量低于历史最大重量30%
  if (maxHistoricalWeight > 0 && exercise.weight < maxHistoricalWeight * 0.3) {
    return { isWarmup: true, reason: '重量过低' }
  }

  return { isWarmup: false, reason: '' }
}

// 重量变更时自动判断热身
function onWeightChange(index: number) {
  const exercise = formData.exercises[index]
  // 模拟历史最大重量（实际应从历史记录获取）
  // 这里用40kg作为胸部训练的参考值
  const mockMaxWeight = 40
  const result = autoDetectWarmup(exercise, mockMaxWeight)
  if (result.isWarmup && !exercise.isWarmup) {
    exercise.isWarmup = true
    uni.showToast({ title: `已自动标记为热身组（${result.reason}）`, icon: 'none' })
  }
}

// 次数变更时自动判断热身
function onRepsChange(index: number) {
  const exercise = formData.exercises[index]
  if (exercise.reps > 15 && !exercise.isWarmup) {
    exercise.isWarmup = true
    uni.showToast({ title: '已自动标记为热身组（次数超过15次）', icon: 'none' })
  }
}

// ============ 滑动删除 ============
const touchStartX = ref(0)
const touchStartY = ref(0)
const swipingIndex = ref(-1)

function onTouchStart(e: TouchEvent, index: number) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  swipingIndex.value = -1
}

function onTouchMove(e: TouchEvent, index: number) {
  const deltaX = e.touches[0].clientX - touchStartX.value
  const deltaY = e.touches[0].clientY - touchStartY.value

  // 只在水平滑动时触发
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
    swipingIndex.value = index
  }
}

function onTouchEnd(index: number) {
  swipingIndex.value = -1
}

// ============ 其他方法 ============

// 判断是否是纯热身组
function hasWarmupOnly(exercise: ExerciseSet): boolean {
  return exercise.isWarmup && exercise.weight > 0
}

// 热身切换
function toggleWarmup(index: number) {
  formData.exercises[index].isWarmup = !formData.exercises[index].isWarmup
}

// 删除动作
function removeExercise(index: number) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个动作吗？',
    success: (res) => {
      if (res.confirm) {
        formData.exercises.splice(index, 1)
      }
    }
  })
}

// 日期变更
function onDateChange(e: any) {
  formData.date = e.detail.value
}

// 组数变更（自动判断热身）
function onSetsChange(index: number) {
  const exercise = formData.exercises[index]
  // 如果只有1组且重量较大，自动标记为非热身
  if (exercise.sets === 1 && exercise.weight > 40) {
    exercise.isWarmup = false
  }
}

// 帮助
function showHelp() {
  uni.showModal({
    title: '使用提示',
    content: '1. 点击动作名称可选择动作\n2. 热身组重量会自动判断\n3. 保存后会计算总容量和e1RM',
    showCancel: false,
  })
}

// 取消
function handleCancel() {
  emit('cancel')
}

// 保存
async function handleSave() {
  // 验证
  if (!formData.trainingType) {
    uni.showToast({ title: '请输入训练类型', icon: 'none' })
    return
  }
  if (formData.exercises.length === 0) {
    uni.showToast({ title: '请至少添加一个动作', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })
  try {
    const result = await saveTrainingRecord({
      date: formData.date,
      trainingType: formData.trainingType,
      exercises: formData.exercises.map(ex => ({
        ...ex,
        weightUnit: 'kg',
      })),
      notes: formData.notes,
    })
    uni.hideLoading()
    uni.showToast({ title: result.message, icon: 'success' })
    emit('save', result)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.record-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.help-icon {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 24rpx;
  color: #999;
}

/* 基本信息 */
.basic-info {
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-label {
  font-size: 28rpx;
  color: #666;
  width: 140rpx;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.info-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
}

/* 动作列表 */
.exercises-section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  background: #f8f8f8;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}

.table-header text {
  font-size: 22rpx;
  color: #999;
  text-align: center;
}

.exercise-row-wrapper {
  position: relative;
  overflow: hidden;
}

.exercise-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  background: #fff;
  transition: transform 0.2s;
}

.exercise-row.is-warmup {
  background: rgba(255, 152, 0, 0.08);
}

.exercise-row.swiped {
  transform: translateX(-120rpx);
}

.swipe-action {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f56c6c;
}

.swipe-delete {
  color: #fff;
  font-size: 28rpx;
}

.col-name {
  flex: 2;
  padding: 0 8rpx;
}

.col-sets,
.col-reps,
.col-warmup,
.col-action {
  flex: 1;
  text-align: center;
}

.col-weight {
  flex: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exercise-name {
  font-size: 26rpx;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warmup-tag {
  font-size: 20rpx;
  color: #ff9800;
}

.num-input {
  width: 100%;
  height: 56rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  text-align: center;
  font-size: 26rpx;
}

.weight-input {
  width: 80rpx;
}

.unit {
  font-size: 22rpx;
  color: #999;
  margin-left: 4rpx;
}

.warmup-toggle {
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 28rpx;
  color: #ccc;
}

.warmup-toggle.active {
  background: #fff3e0;
  color: #ff9800;
}

.delete-btn {
  font-size: 24rpx;
  color: #f56c6c;
}

.add-exercise-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
  margin-top: 16rpx;
  color: #999;
  font-size: 28rpx;
}

.add-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

/* 备注 */
.notes-section {
  margin-bottom: 24rpx;
}

.notes-section .section-title {
  display: block;
  margin-bottom: 12rpx;
}

.notes-input {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

/* 底部按钮 */
.card-footer {
  display: flex;
  gap: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 20rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-save {
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
}
</style>