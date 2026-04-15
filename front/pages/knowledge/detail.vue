<template>
  <view class="article-detail-page">
    <!-- Loading State -->
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <!-- Article Content -->
    <view v-else-if="article" class="article-content">
      <!-- Cover Image -->
      <image v-if="article.coverImage" :src="article.coverImage" class="cover-image" mode="widthFix" />

      <!-- Article Header -->
      <view class="article-header">
        <view class="tags" v-if="article.tags?.length">
          <text v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
        <view class="title">{{ article.title }}</view>
        <view class="meta">
          <text class="category">{{ article.category?.name }}</text>
          <text class="date">{{ formatDate(article.publishedAt) }}</text>
        </view>
      </view>

      <!-- Article Body -->
      <view class="article-body">
        <rich-text :nodes="article.content"></rich-text>
      </view>

      <!-- Article Footer -->
      <view class="article-footer">
        <view class="stats">
          <text class="views">{{ article.viewCount }} 阅读</text>
          <text class="likes" @click="onLike">{{ article.likeCount }} 赞</text>
        </view>
        <view class="author" v-if="article.author">
          <text>作者：{{ article.author.nickname || '未知' }}</text>
        </view>
      </view>

      <!-- Related Actions -->
      <view class="actions">
        <button class="action-btn" @click="onLike">
          <text class="icon">👍</text>
          <text>点赞</text>
        </button>
        <button class="action-btn" open-type="share">
          <text class="icon">📤</text>
          <text>分享</text>
        </button>
      </view>

      <!-- Contribution Button -->
      <view class="contribute-section" v-if="canContribute">
        <button class="contribute-btn" @click="showContributeModal = true">补充/纠错</button>
      </view>
    </view>

    <!-- Error State -->
    <view v-else class="error-container">
      <text>文章不存在或已被删除</text>
      <button @click="goBack" class="back-btn">返回</button>
    </view>

    <!-- Contribute Modal -->
    <view v-if="showContributeModal" class="modal-overlay" @click="showContributeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text>补充/纠错</text>
          <text class="close" @click="showContributeModal = false">×</text>
        </view>
        <view class="modal-body">
          <textarea
            v-model="contributeContent"
            placeholder="请输入您的补充或纠错内容..."
            class="contribute-input"
          />
        </view>
        <view class="modal-footer">
          <button @click="showContributeModal = false" class="cancel-btn">取消</button>
          <button @click="submitContribution" class="submit-btn">提交</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { knowledgeApi, type Article } from '@/api/knowledge'

const article = ref<Article | null>(null)
const loading = ref(true)
const showContributeModal = ref(false)
const contributeContent = ref('')

// For demo purposes, assume user is logged in
const canContribute = ref(true)

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const id = currentPage?.options?.id

  if (id) {
    fetchArticle(id)
  } else {
    loading.value = false
  }
})

async function fetchArticle(id: string) {
  loading.value = true
  try {
    article.value = await knowledgeApi.getArticle(id)
  } catch (error) {
    console.error('Failed to fetch article:', error)
    article.value = null
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function onLike() {
  if (!article.value) return
  try {
    await knowledgeApi.likeArticle(article.value.id)
    article.value.likeCount++
  } catch (error) {
    console.error('Failed to like article:', error)
  }
}

async function submitContribution() {
  if (!article.value || !contributeContent.value.trim()) return

  try {
    await knowledgeApi.contribute({
      articleId: article.value.id,
      content: contributeContent.value
    })
    showContributeModal.value = false
    contributeContent.value = ''
    uni.showToast({ title: '提交成功', icon: 'success' })
  } catch (error) {
    console.error('Failed to submit contribution:', error)
    uni.showToast({ title: '提交失败', icon: 'none' })
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.article-detail-page {
  min-height: 100vh;
  background: #fff;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #999;
  font-size: 28rpx;
}

.error-container .back-btn {
  margin-top: 20rpx;
  padding: 16rpx 40rpx;
  background: #07c160;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.article-content {
  padding-bottom: 40rpx;
}

.cover-image {
  width: 100%;
  display: block;
}

.article-header {
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .tags {
    margin-bottom: 16rpx;
    .tag {
      display: inline-block;
      padding: 4rpx 16rpx;
      margin-right: 12rpx;
      background: #e8f8ed;
      color: #07c160;
      font-size: 22rpx;
      border-radius: 4rpx;
    }
  }

  .title {
    font-size: 40rpx;
    font-weight: bold;
    line-height: 1.4;
    margin-bottom: 20rpx;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 20rpx;
    font-size: 24rpx;
    color: #999;

    .category {
      color: #07c160;
    }
  }
}

.article-body {
  padding: 30rpx;
  font-size: 30rpx;
  line-height: 1.8;
  color: #333;

  :deep(p) {
    margin-bottom: 20rpx;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
  }
}

.article-footer {
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;

  .stats {
    display: flex;
    gap: 40rpx;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 16rpx;
  }

  .author {
    font-size: 24rpx;
    color: #999;
  }
}

.actions {
  display: flex;
  justify-content: center;
  gap: 60rpx;
  padding: 30rpx;

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    background: none;
    padding: 0;
    font-size: 24rpx;
    color: #666;

    .icon {
      font-size: 40rpx;
    }
  }
}

.contribute-section {
  padding: 0 30rpx 30rpx;

  .contribute-btn {
    width: 100%;
    padding: 24rpx;
    background: #fff;
    border: 2rpx solid #07c160;
    color: #07c160;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-height: 60vh;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 32rpx;
  font-weight: bold;

  .close {
    font-size: 48rpx;
    color: #999;
    line-height: 1;
  }
}

.modal-body {
  padding: 30rpx;

  .contribute-input {
    width: 100%;
    min-height: 200rpx;
    padding: 20rpx;
    border: 1rpx solid #ddd;
    border-radius: 8rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: 24rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
  }

  .cancel-btn {
    background: #f5f5f5;
    color: #666;
  }

  .submit-btn {
    background: #07c160;
    color: #fff;
  }
}
</style>
