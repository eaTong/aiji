<template>
  <view class="markdown-content">
    <text v-for="(token, index) in tokens" :key="index" :class="getTokenClass(token)">{{ token.text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  content: string
}>()

interface Token {
  type: string
  text: string
  raw?: string
  tokens?: Token[]
}

const tokens = computed(() => {
  if (!props.content) return []
  const result = marked.parse(props.content, { async: false }) as string
  return parseInline(result)
})

function parseInline(text: string): Token[] {
  const tokens: Token[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\[([^\]]+)\]\([^)]+\))/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    const fullMatch = match[0]
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      tokens.push({ type: 'bold', text: fullMatch.slice(2, -2) })
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      tokens.push({ type: 'italic', text: fullMatch.slice(1, -1) })
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      tokens.push({ type: 'code', text: fullMatch.slice(1, -1) })
    } else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) {
      tokens.push({ type: 'strike', text: fullMatch.slice(2, -2) })
    } else if (fullMatch.startsWith('[')) {
      const linkMatch = fullMatch.match(/\[([^\]]+)\]\([^)]+\)/)
      if (linkMatch) {
        tokens.push({ type: 'link', text: linkMatch[1] })
      }
    }

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', text }]
}

function getTokenClass(token: Token): string {
  switch (token.type) {
    case 'bold':
      return 'md-bold'
    case 'italic':
      return 'md-italic'
    case 'code':
      return 'md-code'
    case 'strike':
      return 'md-strike'
    case 'link':
      return 'md-link'
    default:
      return ''
  }
}
</script>

<style lang="scss" scoped>
.markdown-content {
  font-size: 28rpx;
  line-height: 1.6;
  word-break: break-word;
}

.md-bold {
  font-weight: bold;
}

.md-italic {
  font-style: italic;
}

.md-code {
  background: #f0f0f0;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-family: monospace;
  font-size: 26rpx;
}

.md-strike {
  text-decoration: line-through;
  color: #999;
}

.md-link {
  color: #07c160;
}
</style>
