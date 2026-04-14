<template>
  <view class="container">
    <!-- 今日补剂记录 -->
    <view class="today-card">
      <view class="card-header">
        <text class="card-title">今日补剂</text>
        <text class="card-date">{{ todayStr }}</text>
      </view>
      <view v-if="todayRecords.length === 0" class="empty">
        <text>今日还没有记录</text>
      </view>
      <view v-else class="record-list">
        <view v-for="record in todayRecords" :key="record.id" class="record-item">
          <view class="record-info">
            <text class="record-name">{{ record.supplement }}</text>
            <text class="record-meta">
              {{ record.dosage || '' }} {{ record.timing || '' }}
            </text>
          </view>
          <button class="delete-btn" @click="deleteRecord(record.id)">×</button>
        </view>
      </view>
    </view>

    <!-- 添加补剂按钮 -->
    <view class="add-section">
      <button class="add-btn" @click="showAddModal = true">+ 添加补剂</button>
    </view>

    <!-- 历史记录 -->
    <view class="history-card">
      <text class="card-title">最近记录</text>
      <view v-for="(records, date) in groupedRecords" :key="date" class="date-group">
        <view class="date-header">{{ formatDate(date) }}</view>
        <view v-for="record in records" :key="record.id" class="history-item">
          <text class="history-name">{{ record.supplement }}</text>
          <text class="history-meta">{{ record.dosage || '' }}</text>
        </view>
      </view>
    </view>

    <!-- 添加补剂弹窗 -->
    <view v-if="showAddModal" class="modal-mask" @click="showAddModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">添加补剂</text>

        <!-- 补剂选择 -->
        <view class="form-item">
          <text class="form-label">选择补剂</text>
          <view class="supplement-grid">
            <view
              v-for="item in SUPPLEMENTS"
              :key="item.value"
              :class="['supplement-item', { selected: selectedSupplement === item.label }]"
              @click="selectSupplement(item)"
            >
              <text>{{ item.label }}</text>
            </view>
          </view>
        </view>

        <!-- 用量输入 -->
        <view class="form-item">
          <text class="form-label">用量</text>
          <input
            v-model="dosage"
            class="form-input"
            placeholder="如 30g、2粒"
          />
        </view>

        <!-- 服用时间 -->
        <view class="form-item">
          <text class="form-label">服用时间</text>
          <view class="timing-grid">
            <view
              v-for="timing in TIMINGS"
              :key="timing"
              :class="['timing-item', { selected: selectedTiming === timing }]"
              @click="selectedTiming = timing"
            >
              <text>{{ timing }}</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="modal-actions">
          <button class="btn-cancel" @click="showAddModal = false">取消</button>
          <button class="btn-confirm" @click="addRecord">确认添加</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getSupplements,
  createSupplement,
  deleteSupplement,
  SUPPLEMENTS,
  TIMINGS,
  type SupplementRecord,
} from '../../api/supplement'

const todayStr = new Date().toISOString().split('T')[0]

const todayRecords = ref<SupplementRecord[]>([])
const allRecords = ref<SupplementRecord[]>([])
const showAddModal = ref(false)
const selectedSupplement = ref('')
const dosage = ref('')
const selectedTiming = ref('')

const groupedRecords = computed(() => {
  const groups: Record<string, SupplementRecord[]> = {}
  for (const record of allRecords.value) {
    const date = record.date.split('T')[0]
    if (date !== todayStr) {
      if (!groups[date]) groups[date] = []
      groups[date].push(record)
    }
  }
  return groups
})

function selectSupplement(item: { label: string; defaultDosage: string }) {
  selectedSupplement.value = item.label
  if (!dosage.value && item.defaultDosage) {
    dosage.value = item.defaultDosage
  }
}

async function loadRecords() {
  try {
    const records = await getSupplements({ days: 30 })
    allRecords.value = records
    todayRecords.value = records.filter(r => r.date.split('T')[0] === todayStr)
  } catch (e) {
    console.error('加载补剂记录失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function addRecord() {
  if (!selectedSupplement.value) {
    uni.showToast({ title: '请选择补剂', icon: 'none' })
    return
  }

  try {
    await createSupplement({
      supplement: selectedSupplement.value,
      dosage: dosage.value || undefined,
      timing: selectedTiming.value || undefined,
    })
    uni.showToast({ title: '添加成功', icon: 'success' })
    showAddModal.value = false
    resetForm()
    await loadRecords()
  } catch (e) {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

async function deleteRecord(id: string) {
  try {
    await deleteSupplement(id)
    uni.showToast({ title: '已删除', icon: 'success' })
    await loadRecords()
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function resetForm() {
  selectedSupplement.value = ''
  dosage.value = ''
  selectedTiming.value = ''
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.container {
  padding: 24rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.today-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.card-date {
  font-size: 26rpx;
  color: #999;
}

.empty {
  text-align: center;
  padding: 40rpx;
  color: #ccc;
  font-size: 28rpx;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 16rpx;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.record-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.record-meta {
  font-size: 24rpx;
  color: #666;
}

.delete-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #ffebee;
  color: #f56c6c;
  font-size: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.add-section {
  margin-bottom: 24rpx;
}

.add-btn {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}

.date-group {
  margin-top: 24rpx;
}

.date-header {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.history-name {
  font-size: 28rpx;
  color: #333;
}

.history-meta {
  font-size: 24rpx;
  color: #666;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.modal-content {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.supplement-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.supplement-item {
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  text-align: center;
  border: 4rpx solid transparent;
}

.supplement-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.supplement-item text {
  font-size: 28rpx;
  color: #333;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.timing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.timing-item {
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
  border: 4rpx solid transparent;
}

.timing-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.timing-item text {
  font-size: 24rpx;
  color: #333;
}

.modal-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}

.btn-cancel {
  flex: 1;
  height: 96rpx;
  background: #f5f5f5;
  color: #666;
  font-size: 32rpx;
  border-radius: 48rpx;
  border: none;
}

.btn-confirm {
  flex: 2;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
}
</style>
