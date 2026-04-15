<template>
  <view class="knowledge-page">
    <!-- Search Bar -->
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索知识库" @confirm="onSearch" />
    </view>

    <!-- Category Tabs -->
    <scroll-view scroll-x class="category-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', { active: currentType === tab.value }]"
        @click="onTabChange(tab.value)"
      >
        {{ tab.label }}
      </view>
    </scroll-view>

    <!-- Article List -->
    <scroll-view scroll-y class="article-list" @scrolltolower="loadMore">
      <view v-for="article in articles" :key="article.id" class="article-item" @click="goToDetail(article.id)">
        <image v-if="article.coverImage" :src="article.coverImage" class="cover" mode="aspectFill" />
        <view class="content">
          <view class="title">{{ article.title }}</view>
          <view class="summary">{{ article.summary || '' }}</view>
          <view class="meta">
            <text class="category">{{ article.category?.name }}</text>
            <text class="views">{{ article.viewCount }} 阅读</text>
          </view>
        </view>
      </view>
      <view v-if="loading" class="loading">加载中...</view>
      <view v-if="noMore" class="no-more">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { knowledgeApi, type Article } from '@/api/knowledge'

const keyword = ref('')
const currentType = ref('')
const articles = ref<Article[]>([])
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const noMore = ref(false)

const tabs = [
  { label: '全部', value: '' },
  { label: '健身百科', value: 'KNOWLEDGE' },
  { label: '常见问题', value: 'FAQ' },
  { label: '课程内容', value: 'COURSE' }
]

onMounted(() => {
  fetchArticles()
})

async function fetchArticles(reset = false) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    articles.value = []
    noMore.value = false
  }
  loading.value = true
  try {
    const data = await knowledgeApi.getArticles({
      page: page.value,
      pageSize: pageSize.value,
      type: currentType.value,
      keyword: keyword.value
    })
    if (reset) {
      articles.value = data.articles
    } else {
      articles.value = [...articles.value, ...data.articles]
    }
    if (data.articles.length < pageSize.value) {
      noMore.value = true
    }
  } finally {
    loading.value = false
  }
}

function onTabChange(type: string) {
  currentType.value = type
  fetchArticles(true)
}

function onSearch() {
  fetchArticles(true)
}

function loadMore() {
  if (!noMore.value) {
    page.value++
    fetchArticles()
  }
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/knowledge/detail?id=${id}` })
}
</script>

<style scoped lang="scss">
.knowledge-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  padding: 20rpx 30rpx;
  background: #fff;
  input {
    background: #f0f0f0;
    border-radius: 8rpx;
    padding: 16rpx 24rpx;
    font-size: 28rpx;
  }
}

.category-tabs {
  background: #fff;
  white-space: nowrap;
  padding: 0 20rpx;
  .tab {
    display: inline-block;
    padding: 20rpx 30rpx;
    font-size: 28rpx;
    color: #666;
    &.active {
      color: #07c160;
      border-bottom: 4rpx solid #07c160;
    }
  }
}

.article-list {
  height: calc(100vh - 200rpx);
  padding: 20rpx;
}

.article-item {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  .cover {
    width: 100%;
    height: 300rpx;
  }
  .content {
    padding: 24rpx;
    .title {
      font-size: 32rpx;
      font-weight: bold;
      margin-bottom: 12rpx;
    }
    .summary {
      font-size: 26rpx;
      color: #666;
      margin-bottom: 16rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 24rpx;
      color: #999;
    }
  }
}

.loading, .no-more {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
</style>
