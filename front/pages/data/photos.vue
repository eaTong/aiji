<template>
  <view class="container">
    <view class="card">
      <text class="card-title">上传进度照片</text>
      <view class="angle-tabs">
        <text
          v-for="a in angles"
          :key="a.value"
          :class="['angle-tab', { active: selectedAngle === a.value }]"
          @tap="selectedAngle = a.value"
        >{{ a.label }}</text>
      </view>
      <button class="upload-btn" @tap="choosePhoto">选择照片上传</button>
    </view>

    <view class="photo-grid">
      <view v-for="photo in photos" :key="photo.id" class="photo-item">
        <image :src="photo.photoUrl" mode="aspectFill" class="photo-img" />
        <text class="photo-meta">{{ angleLabel(photo.angle) }} · {{ photo.recordedAt }}</text>
      </view>
    </view>
    <view v-if="!photos.length" class="empty">暂无照片，上传第一张</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { uploadPhoto, getPhotos } from '../../api/bodyData'
import { today } from '../../utils/date'
import { ProgressPhoto } from '../../types'

const angles = [
  { label: '正面', value: 'FRONT' },
  { label: '侧面', value: 'SIDE' },
  { label: '背面', value: 'BACK' },
]
const selectedAngle = ref('FRONT')
const photos = ref<ProgressPhoto[]>([])

const angleLabelMap: Record<string, string> = {
  FRONT: '正面',
  SIDE: '侧面',
  BACK: '背面',
}
function angleLabel(angle: string) {
  return angleLabelMap[angle] ?? angle
}

async function choosePhoto() {
  const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] })
  const tempPath = res.tempFilePaths[0]
  // 实际项目需上传到云存储，此处简化处理
  await uploadPhoto({
    photoUrl: tempPath,
    angle: selectedAngle.value,
    recordedAt: today(),
  })
  photos.value = await getPhotos()
  uni.showToast({ title: '上传成功', icon: 'success' })
}

onMounted(async () => {
  try {
    photos.value = await getPhotos()
  } catch {
    // ignore
  }
})
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.angle-tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.angle-tab { padding: 12rpx 32rpx; border-radius: 32rpx; border: 1rpx solid #eee; font-size: 28rpx; color: #666; }
.angle-tab.active { background: #333; color: #fff; border-color: #333; }
.upload-btn { background: #333; color: #fff; border-radius: 48rpx; }
.photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.photo-item { background: #fff; border-radius: 16rpx; overflow: hidden; }
.photo-img { width: 100%; height: 300rpx; }
.photo-meta { font-size: 22rpx; color: #999; padding: 12rpx; display: block; }
.empty { text-align: center; color: #ccc; padding: 80rpx 0; font-size: 28rpx; }
</style>