<template>
  <div class="carousel" @mouseover="stopInterval" @mouseleave="startInterval">
    <div class="carousel-view">
      <div class="carousel-panel" :ref="ref">
        <div class="carousel-curr">
          <slot></slot>
        </div>
        <div class="carousel-next">
          <slot></slot>
        </div>
      </div>
    </div>
    <slot name="prev">
      <button class="carousel-btn prev" @click="prev">&lt;</button>
    </slot>
    <slot name="next">
      <button class="carousel-btn next" @click="next">&gt;</button>
    </slot>
    <slot name="indicator">
      <div class="default-indicator">
        <span class="indicator-item" :class="{active:active===index}" v-for="(item,index) in count" :key="index"
              @click="setActiveItem(index)"></span>
      </div>
    </slot>
  </div>
</template>

<script>
  import Animate from '../../../util/animate'

  const ResizeSensor = require('css-element-queries/src/ResizeSensor')

  const guid = require('guid')

  export default {
    name: 'RCarousel',
    data () {
      return {
        ref: guid.raw(),
        count: 0,
        active: 0,
        option: {width: 0, height: 0},
        intervalId: null,
        animateQueue: [],
        animateId: ''
      }
    },
    computed: {
      carousel () {
        return this.$refs[this.ref]
      }
    },
    mounted () {
      this.$nextTick(() => {
        new ResizeSensor(this.carousel, () => {
          this.init()
        })
        this.count = this.$slots.default.length
        this.option.width = this.width
        this.option.height = this.height
        this.init()
        this.startInterval()
        window.addEventListener('visibilitychange', evt => {
          switch (document.visibilityState) {
            case 'prerender':
              break
            case 'hidden':
              this.stopInterval()
              break
            case 'visible':
              this.startInterval()
              break
          }
        })
      })
    },
    methods: {
      init () {
        if (!this.option.width) this.option.width = this.carousel.offsetWidth
        if (!this.option.height) this.option.height = this.carousel.offsetHeight
        if (this.isHorizontal) {
          this.carousel.style.width = this.option.width * (this.count + 1) + 'px'
        } else {
          this.carousel.style.height = this.option.height * (this.count + 1) + 'px'
        }

        this.carousel.childNodes.forEach(child => {
          if (!child.classList.contains('carousel-curr')) {
            child.style.width = this.option.width + 'px'
            child.style.height = this.option.height + 'px'
          } else {
            if (this.isHorizontal) {
              child.style.width = this.option.width * this.count + 'px'
            } else {
              child.style.height = this.option.height * this.count + 'px'
            }
          }
          child.childNodes.forEach(item => {
            item.style.display = 'inline-block'
            item.style.overflow = 'hidden'
            item.style.width = this.option.width + 'px'
            item.style.height = this.option.height + 'px'
          })
        })
      },
      stopInterval () {
        if (this.intervalId) {
          clearInterval(this.intervalId)
        }
      },
      startInterval () {
        if (this.autoplay) {
          this.intervalId = setInterval(() => {
            this.next()
          }, this.interval)
        }
      },
      setActiveItem (index) {
        let curr = this.active
        if (index === curr) {
          // 结束
        } else if (index > curr) {
          // 往后翻
          this.next(null, 100)
          this.setActiveItem(index)
        } else {
          // 往前翻
          this.prev(null, 100)
          this.setActiveItem(index)
        }
      },
      prev (ev, time) {
        let oldIndex = this.active
        this.active--
        if (this.active < 0) this.active = this.count - 1
        let index = this.active
        let lf = 0
        let lt = 0

        let tf = 0
        let tt = 0
        if (this.isHorizontal) {
          lf = -(index + 1) * this.option.width
          lt = -index * this.option.width
        } else {
          tf = -(index + 1) * this.option.height
          tt = -index * this.option.height
        }
        this.animation({
          from: {left: lf, top: tf},
          to: {left: lt, top: tt},
          time: time || this.animateTime,
          index: index,
          oldIndex: oldIndex,
          onUpdate: res => {
            this.carousel.style.left = res.left + 'px'
            this.carousel.style.top = res.top + 'px'
          }
        })
      },
      next (ev, time) {
        let oldIndex = this.active
        this.active++
        let index = this.active
        if (this.active > this.count - 1) this.active = 0
        let lf = 0
        let lt = 0

        let tf = 0
        let tt = 0
        if (this.isHorizontal) {
          lf = -(index - 1) * this.option.width
          lt = -index * this.option.width
        } else {
          tf = -(index - 1) * this.option.height
          tt = -index * this.option.height
        }
        if (index > this.count - 1) index = 0

        this.animation({
          from: {left: lf, top: tf},
          to: {left: lt, top: tt},
          time: time || this.animateTime,
          index: index,
          oldIndex: oldIndex,
          onUpdate: res => {
            this.carousel.style.left = res.left + 'px'
            this.carousel.style.top = res.top + 'px'
          }
        })
      },
      animation ({from, to, time, onUpdate, index, oldIndex} = {}) {
        if (!from) return
        if (this.animateId) return this.animateQueue.push({from, to, time, onUpdate, index, oldIndex})
        this.animateId = true

        let animate = new Animate(from)
        animate.to(to, time)
        animate.onUpdate(onUpdate)
        animate.onComplete(() => {
          this.animateId = false
          this.$emit('change', index, oldIndex)
          this.animation(this.animateQueue.shift())
        })
        animate.start()
      }
    },
    props: {
      width: {
        type: Number,
        default: null
      },
      height: {
        type: Number,
        default: null
      },
      animateTime: {
        type: Number,
        default: 500
      },
      isHorizontal: {
        type: Boolean,
        default: true
      },
      autoplay: {
        type: Boolean,
        default: true
      },
      interval: {
        type: Number,
        default: 3000
      }
    }
  }
</script>

<style scoped>

  .carousel {
    height: 100%;
    width: 100%;
    position: relative;
  }

  .carousel .carousel-view {
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
  }

  .carousel-view .carousel-panel {
    height: 100%;
    width: 100%;
    font-size: 0;
    position: absolute;
    top: 0;
    left: 0;
  }

  .carousel-view .carousel-panel > div {
    display: inline-block;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .carousel-view .carousel-panel > div > * {
    display: inline-block;
  }

  .carousel-view .carousel-panel > div.carousel-curr > * {
    display: inline-block;
  }

  .carousel .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    outline: none;
  }

  .carousel .carousel-btn:hover {
    background-color: aquamarine;
  }

  .carousel .carousel-btn.prev {
    left: 20px;
  }

  .carousel .carousel-btn.next {
    right: 20px;
  }

  .carousel .default-indicator {
    position: absolute;
    text-align: center;
    width: 100%;
    bottom: 5px;
  }

  .carousel .default-indicator .indicator-item {
    display: inline-block;
    width: 30px;
    height: 10px;
    background-color: #cccccc;
    margin-left: 10px;
  }

  .carousel .default-indicator .indicator-item:nth-child(1) {
    margin-left: 0;
  }

  .carousel .default-indicator .indicator-item.active {
    background-color: aqua;
  }

</style>
