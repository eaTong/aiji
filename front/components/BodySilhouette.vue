<template>
  <view class="silhouette-container">
    <svg
      class="body-svg"
      viewBox="0 0 200 420"
      width="320rpx"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Head (non-clickable) -->
      <ellipse cx="100" cy="30" rx="18" ry="22" fill="#ccc" />

      <!-- Neck -->
      <rect x="92" y="50" width="16" height="12" fill="#ccc" />

      <!-- Chest (upper torso) -->
      <path
        :fill="hasData('chest') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="chest"
        @tap="onTap('chest')"
        d="M68 62 L132 62 L135 105 L65 105 Z"
      />

      <!-- Waist (mid torso) -->
      <path
        :fill="hasData('waist') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="waist"
        @tap="onTap('waist')"
        d="M70 108 L130 108 L128 140 L72 140 Z"
      />

      <!-- Hip (lower torso) -->
      <path
        :fill="hasData('hip') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="hip"
        @tap="onTap('hip')"
        d="M72 143 L128 143 L125 180 L75 180 Z"
      />

      <!-- Left Arm -->
      <path
        :fill="hasData('leftArm') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="leftArm"
        @tap="onTap('leftArm')"
        d="M48 65 L64 62 L60 130 L44 125 Z"
      />

      <!-- Right Arm -->
      <path
        :fill="hasData('rightArm') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="rightArm"
        @tap="onTap('rightArm')"
        d="M136 62 L152 65 L156 125 L140 130 Z"
      />

      <!-- Left Thigh -->
      <path
        :fill="hasData('leftThigh') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="leftThigh"
        @tap="onTap('leftThigh')"
        d="M75 183 L100 183 L98 270 L73 270 Z"
      />

      <!-- Right Thigh -->
      <path
        :fill="hasData('rightThigh') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="rightThigh"
        @tap="onTap('rightThigh')"
        d="M100 183 L125 183 L127 270 L102 270 Z"
      />

      <!-- Left Calf -->
      <path
        :fill="hasData('leftCalf') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="leftCalf"
        @tap="onTap('leftCalf')"
        d="M73 273 L98 273 L95 360 L72 360 Z"
      />

      <!-- Right Calf -->
      <path
        :fill="hasData('rightCalf') ? '#333' : '#D0D0D0'"
        class="hotspot"
        data-part="rightCalf"
        @tap="onTap('rightCalf')"
        d="M102 273 L127 273 L128 360 L105 360 Z"
      />
    </svg>

    <!-- Legend -->
    <view class="legend">
      <view class="legend-item">
        <view class="legend-dot" style="background: #D0D0D0;"></view>
        <text class="legend-text">未录入</text>
      </view>
      <view class="legend-item">
        <view class="legend-dot" style="background: #333;"></view>
        <text class="legend-text">已录入</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
export type PartKey = 'chest' | 'waist' | 'hip' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf'

const props = defineProps<{
  data?: Partial<Record<PartKey, number>>
}>()

const emit = defineEmits<{
  (e: 'tap', part: PartKey): void
}>()

function hasData(part: PartKey): boolean {
  return props.data?.[part] !== undefined && props.data?.[part] !== null
}

function onTap(part: PartKey) {
  emit('tap', part)
}
</script>

<style>
.silhouette-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
}

.body-svg {
  display: block;
}

.hotspot {
  cursor: pointer;
  transition: opacity 0.2s;
}

.hotspot:active {
  opacity: 0.7;
}

.legend {
  display: flex;
  flex-direction: row;
  gap: 32rpx;
  margin-top: 24rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.legend-text {
  font-size: 24rpx;
  color: #666;
}
</style>
