<template>
  <view class="chat-input-wrapper">
    <!-- 收起按钮 -->
    <view v-if="expanded" class="collapse-btn" @click="handleCollapse">
      <text class="collapse-icon">▼</text>
    </view>

    <!-- 输入区域 -->
    <view class="input-area" :class="{ expanded }">
      <textarea
        v-model="inputValue"
        class="chat-input"
        :placeholder="placeholder"
        :maxlength="500"
        :auto-height="expanded"
        :adjust-position="true"
        :show-confirm-bar="false"
        cursor-spacing="10"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @confirm="handleConfirm"
      />

      <!-- 发送按钮 -->
      <view class="send-btn-wrapper">
        <button
          class="send-btn"
          :disabled="!canSend"
          @click="handleSend"
        >
          <text class="send-icon">➤</text>
        </button>
      </view>
    </view>

    <!-- 快捷提示 -->
    <view v-if="showTips && tips.length > 0" class="quick-tips">
      <view
        v-for="tip in tips"
        :key="tip"
        class="tip-item"
        @click="handleTipClick(tip)"
      >
        <text>{{ tip }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  placeholder?: string
  showTips?: boolean
  tips?: string[]
}>()

const emit = defineEmits<{
  send: [content: string]
  focus: []
  blur: []
}>()

const inputValue = ref('')
const expanded = ref(false)

const canSend = computed(() => inputValue.value.trim().length > 0)

function handleSend() {
  const content = inputValue.value.trim()
  if (!content) return

  emit('send', content)
  inputValue.value = ''
  expanded.value = false
}

function handleConfirm() {
  handleSend()
}

function handleFocus() {
  expanded.value = true
  emit('focus')
}

function handleBlur() {
  emit('blur')
}

function handleInput() {
  // 输入变化
}

function handleCollapse() {
  expanded.value = !expanded.value
}

function handleTipClick(tip: string) {
  inputValue.value = tip
  handleSend()
}
</script>

<style lang="scss" scoped>
.chat-input-wrapper {
  background: #fff;
  border-top: 1rpx solid #eee;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}

.collapse-btn {
  text-align: center;
  padding: 8rpx;
  margin-bottom: 8rpx;
}

.collapse-icon {
  font-size: 20rpx;
  color: #999;
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 12rpx 16rpx;
  transition: all 0.2s;

  &.expanded {
    border-radius: 24rpx;
  }
}

.chat-input {
  flex: 1;
  min-height: 48rpx;
  max-height: 200rpx;
  font-size: 28rpx;
  line-height: 1.4;
  padding: 8rpx 0;
  background: transparent;
}

.send-btn-wrapper {
  flex-shrink: 0;
}

.send-btn {
  width: 64rpx;
  height: 64rpx;
  padding: 0;
  background: #07c160;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;

  &[disabled] {
    background: #ccc;
  }
}

.send-icon {
  font-size: 28rpx;
  color: #fff;
}

.quick-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.tip-item {
  padding: 8rpx 20rpx;
  background: #f0f0f0;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
}
</style>
