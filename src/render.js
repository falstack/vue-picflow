import { debounce } from 'throttle-debounce'

export default {
  name: 'VueFlowRender',
  props: {
    column: {
      type: Number,
      default: 1,
      validator: val => val >= 1
    },
    height: {
      type: Number,
      default: 0,
      validator: val => val >= 0
    },
    remain: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    offset: {
      type: Number,
      required: true
    },
    item: {
      type: Object,
      default: null
    },
    getter: {
      type: Function,
      default: () => {}
    }
  },
  data() {
    return {
      offsetTop: 0,
      lastScrollTop: 0,
      isUp: false,
      start: 0,
      style: {
        height: 0,
        paddingTop: 0
      },
      cache: {}
    }
  },
  computed: {
    isSameHeight() {
      return this.height !== 0
    },
    isSingleColumn() {
      return this.column === 1
    }
  },
  watch: {
    offset(val) {
      this._handleScroll(val)
    },
    total(newVal, oldVal) {
      this._computeRenderHeight(this.$slots.default.slice(oldVal, newVal), oldVal.length)
    }
  },
  mounted() {
    this._computeRenderHeight(this.$slots.default, 0)
    this.setOffsetTop()
  },
  beforeUpdate() {
    this._resetStart()
  },
  methods: {
    setOffsetTop(val) {
      val
        ? this.offsetTop = val
        : this.offsetTop = this.$el.getBoundingClientRect().top
    },
    _resetStart: debounce(16, function() {
      const { lastScrollTop, cache, start, isSameHeight, height, column, offsetTop } = this
      const startRect = cache[start]
      if (startRect.top > lastScrollTop + offsetTop) {
        if (isSameHeight) {
          const decreaseCount = Math.ceil((startRect.top - lastScrollTop) / (height * column))
          const decreaseIndex = Math.max(start - decreaseCount, 0)
          const decreaseRect = cache[decreaseIndex]
          this.start = decreaseIndex
          this.style.paddingTop = decreaseRect.top
        } else {
          for (let i = start - 1; i >= 0; i--) {
            const rect = cache[i]
            if (rect.top <= lastScrollTop) {
              this.start = i
              this.style.paddingTop = rect.top
              break
            }
          }
        }
      }
      const { remain, total } = this
      if (start + remain > total) {
        return
      }
      const endRect = cache[start + remain - 1]
      const parentHeight = this.$el.parentElement.clientHeight
      if (endRect.top + endRect.height < lastScrollTop + parentHeight - offsetTop) {
        if (isSameHeight) {
          const increaseCount = Math.floor((lastScrollTop + parentHeight - endRect.top - endRect.height) / (height * column))
          const increaseIndex = Math.min(start + increaseCount, total - 1)
          const increaseRect = cache[increaseIndex]
          this.start = increaseIndex
          this.style.paddingTop = increaseRect.top
        } else {
          for (let i = start + remain; i < total; i++) {
            const rect = cache[i]
            if (rect.top + rect.height >= lastScrollTop + parentHeight) {
              this.start = i
              this.style.paddingTop = rect.top
              break
            }
          }
        }
      }
    }),
    _handleScroll(offset) {
      this.isUp = offset < this.lastScrollTop
      this.lastScrollTop = offset
      const { start, remain, cache, total, offsetTop } = this
      if (start + remain >= total) {
        return
      }
      if (this.isUp) {
        if (!start) {
          return
        }
        const startRect = cache[start - 1]
        const endRect = cache[start + remain - 1]
        if (endRect.top > offset - offsetTop + this.$el.parentElement.clientHeight) {
          this.style.paddingTop -= startRect.height
          this.start--
        }
      } else {
        const startRect = cache[start]
        if (startRect.top + startRect.height < offset - offsetTop) {
          this.style.paddingTop += startRect.height
          this.start++
        }
      }
    },
    _computeRenderHeight(items, offset) {
      const { height, isSameHeight, total, column, cache, isSingleColumn } = this
      if (!total) {
        return
      }
      if (isSameHeight) {
        if (isSingleColumn) {
          for (let i = 0; i < items.length; i++) {
            cache[i + offset] = {
              height,
              top: height * i
            }
          }
        } else {
          for (let i = 0; i < items.length; i++) {
            cache[i + offset] = {
              height,
              top: height * Math.floor(i / column)
            }
          }
        }
        this.style.height = height * total / column
      } else {
        if (isSingleColumn) {
          let beforeHeight = offset ? cache[offset - 1].top + cache[offset - 1].height : 0
          items.forEach((item, index) => {
            const hgt = +item.data.style.height.replace('px', '')
            cache[index + offset] = {
              height: hgt,
              top: beforeHeight
            }
            beforeHeight += hgt
          })
          this.style.height = beforeHeight
        } else {
          items.forEach((item, index) => {
            const realIndex = index + offset
            const beforeHeight = realIndex > column - 1 ? cache[realIndex - column].top + cache[realIndex - column].height : 0
            const hgt = +item.data.style.height.replace('px', '')
            cache[realIndex] = {
              height: hgt,
              top: beforeHeight
            }
            if (beforeHeight + hgt > this.style.height) {
              this.style.height = beforeHeight + hgt
            }
          })
        }
      }
    },
    _filter(h) {
      const { remain, total, start } = this
      const slots = this.$slots.default

      if (remain >= total) {
        return slots
      }

      return slots.slice(start, start + remain)
    }
  },
  render: function(h) {
    const { paddingTop, height } = this.style
    const list = this._filter(h)

    return h('div', {
      'style': {
        boxSizing: 'border-box',
        height: `${height}px`,
        paddingTop: `${paddingTop}px`
      },
      'class': 'vue-flow-render'
    }, list)
  }
}
