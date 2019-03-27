<template>
  <div class="r-pdf-box">
    <div class="inner-box" :ref="'innerBox'+ref">
      <div class="r-toolbar" @contextmenu.prevent>
        <slot name="pdf-buttons">
          <div class="r-toolbar-item" @click="zoomIn">放大</div>
          <div class="r-toolbar-item" @click="zoomOut">缩小</div>
          <div class="r-toolbar-item">
            <select v-model="scaleType" @change="setScale(scaleType)">
              <option value="original">实际大小</option>
              <option value="page">适合页面</option>
              <option value="screen">适合页宽</option>
              <option :value="0.5">50%</option>
              <option :value="0.75">75%</option>
              <option :value="1">100%</option>
              <option :value="1.25">125%</option>
              <option :value="1.5">150%</option>
              <option :value="2">200%</option>
              <option :value="3">300%</option>
              <option :value="4">400%</option>
              <option :value="scaleType" hidden>{{Math.round(scaleType*100)+'%'}}</option>
            </select>
          </div>
          <div class="r-toolbar-item" @click="clockwise">顺时针旋转</div>
          <div class="r-toolbar-item" @click="antiClockwise">逆时针旋转</div>
          <div class="r-toolbar-item" v-if="cursorType===cursorToolType.select"
               @click="switchCursorTool(cursorToolType.hand)">手形工具
          </div>
          <div class="r-toolbar-item" v-if="cursorType===cursorToolType.hand"
               @click="switchCursorTool(cursorToolType.select)">文本选择工具
          </div>
          <div class="r-toolbar-item" v-if="!selectionShow" @click="showSelection">显示标注</div>
          <div class="r-toolbar-item" v-if="selectionShow" @click="hideSelection">隐藏标注</div>
        </slot>
      </div>
      <div class="stage_box">
        <div class="stage" :ref="'stageBox'+ref" @touchstart.prevent @contextmenu.prevent>
          <div class="container" :id="'container'+ref" :ref="'containerBox'+ref"></div>
          <div class="scrollHbar" :ref="'scrollHbar'+ref">
            <div class="thumbH" :ref="'thumbH'+ref" @pointerdown="HbarScroll"></div>
          </div>
          <div class="scrollWbar" :ref="'scrollWbar'+ref">
            <div class="thumbW" :ref="'thumbW'+ref" @pointerdown="WbarScroll"></div>
          </div>
          <div class="tip" :ref="'tip'+ref" @pointerdown="HbarScroll">{{currentPage+1}}</div>
        </div>
      </div>
      <div class="r-pdf-loaging" v-if="loading">
        <svg class="circular" viewBox="25 25 50 50">
          <circle class="path" cx="50" cy="50" r="20" fill="none"/>
        </svg>
      </div>
      <!--<div class="r-pdf-select top"-->
      <!--:style="{height:maskBound.y+'px',width:`calc(${maskBound.x}px + ${maskBound.width}px)`}"></div>-->
      <!--<div class="r-pdf-select right"-->
      <!--:style="{width:`calc(100vw - ${maskBound.x}px - ${maskBound.width}px)`,height:`calc(${maskBound.y}px + ${maskBound.height}px)`}"></div>-->
      <!--<div class="r-pdf-select bottom"-->
      <!--:style="{height:`calc(100vh - ${maskBound.y}px - ${maskBound.height}px)`,width:`calc(100vw - ${maskBound.x}px)`}"></div>-->
      <!--<div class="r-pdf-select left"-->
      <!--:style="{width:maskBound.x+'px',height:`calc(100vh - ${maskBound.y}px)`}"></div>-->
    </div>
  </div>
</template>

<script>
  const Konva = require('konva')
  // require('../hammer')
  // const Hammer = window.Hammer
  const guid = require('guid')

  const ResizeSensor = require('css-element-queries/src/ResizeSensor')

  export default {
    name: 'RPdf',
    data () {
      return {
        ref: guid.raw(),
        stageSize: {width: 0, height: 0}, // 舞台大小
        scaleType: 'page', // 缩放类型
        imageList: [], // 图片列表
        cacheList: [], // image缓存列表
        caching: {},
        scale: 1, // 缩放
        pdfStage: null, // 舞台
        pdfLayer: null, // 图层
        selectionShow: false,// 是否显示选区

        loading: false,// 加载动画

        currentTop: 0, // 到上面的位置
        currentLeft: 0, // 到左边的距离
        cachePageCount: 10, // 缓存页面个数
        cacheImageCount: 100, // 缓存图片个数
        oldProgress: 0,

        stopInertiaMove: true,
        lastVelocityX: 0,
        lastVelocityY: 0,

        tempScale: 1,
        tempTop: 0,
        lastPointerPositionX: 0,
        lastPointerPositionY: 0,
        firstScreenX: 0,
        firstScreenY: 0,
        firstWord: '',
        lastWord: '',
        isSelect: true,
        outCanvas: '',
        cursorToolType: {
          hand: 'hand',
          select: 'select'
        },
        cursorType: 'select',
        maxScale: 5,
        minScale: 0.1,
        tempLeft: 0,

        selectionList: [],
        maskBound: {x: 100, y: 100, height: 200, width: 200},
        defaultContextmenu: {
          copy: {
            label: '复制',
            show: true,
            icon: '',
            click: () => {
              let selection = this.getSelection()
              let tempEl = document.createElement('textarea')
              tempEl.value = selection.text
              tempEl.display = 'none'
              document.body.append(tempEl)
              tempEl.select()
              document.execCommand('copy')
              tempEl.parentElement.removeChild(tempEl)
            }
          },
          selectAll: {
            label: '全选',
            show: true,
            icon: '',
            click: () => {
              let firstWord = this.imageList[0].text.words[0]
              let page = this.imageList[this.imageList.length - 1]
              let lastWord = page.text.words[page.text.words.length - 1]
              this.drawSelectionRect(firstWord, lastWord)
            }
          }
        }
      }
    },
    computed: {
      scrollHbar () {
        return this.$refs[`scrollHbar${this.ref}`]
      },
      thumbH () {
        return this.$refs[`thumbH${this.ref}`]
      },
      scrollWbar () {
        return this.$refs[`scrollWbar${this.ref}`]
      },
      thumbW () {
        return this.$refs[`thumbW${this.ref}`]
      },
      tip () {
        return this.$refs[`tip${this.ref}`]
      },
      stageBox () {
        return this.$refs[`stageBox${this.ref}`]
      },
      containerBox () {
        return this.$refs[`containerBox${this.ref}`]
      },
      innerBox () {
        return this.$refs[`innerBox${this.ref}`]
      },

      scaleText () {
        return Math.round(this.scale * 10000) / 100 + '%'
      },
      totalCount () {
        return this.imageList.length
      },
      totalHeight () {
        let totalHeight
        if (this.pdfStage && this.totalCount) totalHeight = this.stageSize.height * this.totalCount - this.pdfStage.height() / this.scale
        return totalHeight || this.totalCount
      },
      totalWidth () {
        return this.pdfStage ? (this.stageSize.width - this.pdfStage.width() / this.scale) : this.totalCount
      },
      progressText () {
        return Math.round(this.progress * 10000) / 100 + '%'
      },
      progress () {
        return this.totalHeight && this.currentTop ? this.currentTop / this.totalHeight : this.currentTop
      },
      currentPage () {
        let page = -1
        if (this.stageSize.height) page = Math.floor((this.currentTop + this.pdfStage.height() / this.scale / 2) / this.stageSize.height)
        return page
      },
      currentFile () {
        let img = this.imageList.find(item => item.page === this.currentPage)
        return img ? img.src : ''
      }
    },
    async mounted () {
      this.stageSize.width = this.containerBox.offsetWidth
      this.stageSize.height = this.containerBox.offsetHeight

      this.pdfStage = new Konva.Stage({
        container: `container${this.ref}`,
        offsetX: -this.containerBox.offsetWidth / 2,
        // offsetY: -this.stageSize.height / 2,
        width: this.stageSize.width,
        height: this.stageSize.height
      })
      this.pdfStage.on('contextmenu contentMousedown contentMousemove contentMouseup contentTouchstart contentTouchmove contentTouchend contentTap', evt => {
        let shape
        let pointerPosition

        switch (evt.type) {
          case 'contextmenu':
            evt.evt.preventDefault()
            shape = this.pdfStage.getIntersection(this.getPointerPosition())
            if (!shape || shape.name() !== 'selection') {
              this.clearAllSelection()
            }
            this.$emit('pdf-contextmenu', evt.evt, this.getSelection())
            break
          case 'contentMousedown':
            if (evt.evt.buttons !== 1) return
            if (this.cursorType === this.cursorToolType.hand) {
              this.containerBox.style.cursor = `grabbing`
            }
            this.firstWord = this.getCurrentWord()
            if (this.firstWord) {
              if (evt.evt.shiftKey) {
                this.drawSelectionRect(this.lastWord, this.firstWord)
                return
              } else {
                this.lastWord = this.firstWord
              }
            }
            this.stopInertiaMove = true
            this.clearAllSelection()

            this.firstScreenX = evt.evt.screenX
            this.firstScreenY = evt.evt.screenY
            break
          case 'contentMousemove':
            // console.log('contentMousemove')
            if (evt.evt.shiftKey) return
            if (evt.evt.buttons === 0) {
              this.updateContainerBoxCursor()
              return
            }
            if (evt.evt.buttons !== 1) return
            if (evt.evt.movementX === 0 && evt.evt.movementY === 0) return
            pointerPosition = this.pdfStage.getPointerPosition()
            if (pointerPosition) {
              if (pointerPosition.x < 0 || pointerPosition.y < 0 ||
                pointerPosition.x > this.pdfStage.width() || pointerPosition.y > this.pdfStage.height()) {
                pointerPosition = undefined
              }
            }
            if (!pointerPosition) {
              if (this.outCanvas === 'top') {
                this.scrollView(false)
              } else if (this.outCanvas === 'bottom') {
                this.scrollView(true)
              }
              return
            } else {
              this.lastPointerPositionX = pointerPosition.x
              this.lastPointerPositionY = pointerPosition.y
            }
            if (this.cursorType === this.cursorToolType.select) {
              let currentWord = this.getCurrentWord()
              if (!currentWord) return
              if (!this.firstWord) this.firstWord = currentWord

              this.drawSelectionRect(this.firstWord, currentWord)
            } else {
              this.currentTop -= evt.evt.movementY / this.scale
              this.currentLeft -= evt.evt.movementX / this.scale
              this.locateScrollBarPosition()
              this.scrollStage()
              // console.log('move', this.currentTop)
              // this.lastVelocityY = evt.velocityY
              // this.lastVelocityX = evt.velocityX
            }
            break
          case 'contentMouseup':
            this.updateContainerBoxCursor()
            if (this.cursorType === this.cursorToolType.select) {
              this.firstWord = ''
              let selection = this.getSelection()
              if (selection.text.length) this.$emit('pdf-select', evt.evt, selection)
            } else {
              this.stopInertiaMove = false
              // this.autoScrollView(this.lastVelocityY, this.lastVelocityX)
            }
            break
        }
      })

      this.pdfLayer = new Konva.Layer()

      this.pdfStage.add(this.pdfLayer)

      this.stageBox.addEventListener('wheel', evt => {
        evt.preventDefault()
        evt.stopPropagation()
        if (evt.ctrlKey) {
          if (evt.deltaY > 0) {
            this.zoomOut()
          } else {
            this.zoomIn()
          }
          return
        }
        this.scrollView(evt.deltaY > 0)
      })

      // window.addEventListener('resize', this.handleResize)

      new ResizeSensor(this.stageBox, () => {
        this.handleResize()
      })
      // window.addEventListener('mousemove', (evt) => {
      //   console.log(this.getPointerPosition())
      //   this.pdfStage.fire('contentMousemove', { evt })
      // })
    },
    // beforeDestroy () {
    //   window.removeEventListener('resize', this.handleResize)
    // },
    watch: {
      currentTop () {
        this.oldProgress = this.progress
      }
    },
    methods: {
      // 打开文档
      async open ({data = [], selection = []}) {
        if (data.constructor !== Array) throw new Error('参数[data]类型应该为Array')
        if (selection.constructor !== Array) throw new Error('参数[selection]类型应该为Array')
        if (data.some(item => {
          // 返回true表示参数不符合规范
          if (item.constructor !== Object) {
            // 不是对象不符合
            return true
          } else if (!item.hasOwnProperty('page')) {
            // 没有page不符合
            return true
          } else if (!item.hasOwnProperty('img')) {
            // 没有img不符合
            return true
          } else if (!item.hasOwnProperty('text')) {
            // 没有text不符合
            return true
          }
          return false
        })) {
          throw new Error('参数[data]错误，请检查！')
        }
        if (selection.some(item => {
          // 如果有selection
          if (item.constructor !== Object) {
            // 不是对象不符合
            return true
          } else if (!item.hasOwnProperty('start')) {
            // 没有start不符合
            return true
          } else if (!item.hasOwnProperty('end')) {
            // 没有end不符合
            return true
          } else if (!item.hasOwnProperty('type')) {
            // 没有type不符合
            return true
          } else if (!item.hasOwnProperty('color')) {
            // 没有color不符合
            return true
          }
          return false
        })) {
          throw new Error('参数[selection]错误，请检查！')
        }
        try {
          this.loading = true
          this.initData()
          this.pdfLayer.destroyChildren()
          selection.map(item => {
            this.selectionList.push(item)
          })
          data.map(item => {
            this.imageList.push(item)
          })
          await this.cacheImage()

          await this.loadPages()
        } catch (e) {
          console.error(e)
        } finally {
          this.loading = false
        }
      },
      /**
       * 初始化数据
       */
      initData () {
        this.oldProgress = 0
        this.currentTop = 0
        this.currentLeft = 0
        this.scaleType = 'page'
        this.firstWord = ''
        this.lastWord = ''
        this.stageSize.width = 0
        this.stageSize.height = 0
        this.caching = {}

        // 清空图片列表
        this.imageList.splice(0, this.imageList.length)
        // 清空缓存列表
        this.cacheList.splice(0, this.cacheList.length)
        // 清空选区列表
        this.selectionList.splice(0, this.selectionList.length)
      },
      /**
       * 选择光标工具
       */
      switchCursorTool (type) {
        this.cursorType = type
      },
      /**
       * 设置选区
       */
      async select (selection = {}, bgColor) {
        if (!selection.start || !selection.end) throw new Error('参数 selection 不正确')
        this.clearAllSelection()
        if (/^(\d+)-(\d+)$/.test(selection.start)) {
          await this.skipPage(Number(RegExp.$1))
        }
        let start = this.getWord(selection.start)
        let end = this.getWord(selection.end)
        this.drawSelectionRect(start, end, bgColor)
      },
      /**
       * 根据文字坐标获取文字
       */
      getWord (pos) {
        let pageIndex
        let index
        if (/^(\d+)-(\d+)$/.test(pos)) {
          pageIndex = Number(RegExp.$1)
          index = Number(RegExp.$2)
        }
        let cache = this.imageList.find(item => item.page === pageIndex)
        let text = cache.text
        let word = text.words[index]
        return word
      },
      scrollView (isUp = true) {
        if (isUp) {
          this.currentTop += 100 / this.scale
        } else {
          this.currentTop -= 100 / this.scale
        }

        this.locateScrollBarPosition()

        this.scrollStage()
      },

      /**
       * 清除所有选取
       */
      clearAllSelection () {
        this.pdfStage.find('.selection').map(child => child.destroy())
        this.pdfLayer.draw()
      },
      /**
       * 获取选区
       */
      getSelection () {
        let selection = {start: '', end: '', text: ''}
        let texts = this.pdfStage.find('.selection').map(child => {
          return {
            sort: Number(child.getAttr('id').replace('selection', '')),
            text: child.getAttr('text'),
            start: child.getAttr('start'),
            end: child.getAttr('end')
          }
        })
        if (texts.length) {
          texts.sort((a, b) => (a.sort - b.sort))
          texts.map((child, index) => {
            if (index) selection.text += `\n`
            selection.text += child.text
          })
          selection.start = texts[0].start
          selection.end = texts[texts.length - 1].end
        }
        return selection
      },
      showSelection () {
        this.selectionShow = true
        this.drawSelectionList()
      },
      hideSelection () {
        this.selectionShow = false
        this.pdfStage.find('.pdfmark').map(item => item.destroy())
        this.pdfLayer.draw()
      },
      addSelection (selection) {
        this.selectionList.push(selection)
        this.drawSelectionList()
      },
      // 绘制selection中的选区
      drawSelectionList () {
        if (!this.selectionShow) return
        this.selectionList.map(item => {
          this.drawSelection(item)
        })
      },
      drawSelection (selection) {
        try {
          if (!selection.start || !selection.end) return
          let startWord = this.getWord(selection.start)
          let endWord = this.getWord(selection.end)
          this.drawSelectionByShape(startWord, endWord, selection)
        } catch (e) {
          console.error('绘制选区', e)
        }
      },
      drawSelectionByShape (startWord, endWord, {type, color, selectionid}) {
        let allWords = this.getAllWordsFromWordA2WordB(startWord, endWord)
        let names = Object.keys(allWords)

        names.map(item => {
          // item like "selection002"
          let nodes = this.pdfStage.find(node => node.hasName('pdfmark') && node.hasName(selectionid) && node.hasName(item))
          if (nodes.length) return
          let group = this.pdfStage.findOne(`.${allWords[item].page}`)
          if (!group) return

          let shape = new Konva.Group({
            x: allWords[item].x,
            y: allWords[item].y,
            width: allWords[item].width,
            height: allWords[item].height,
            name: `pdfmark ${selectionid} ${item}`,
            selectionid: selectionid
          })
          shape.on('contextmenu', evt => {
            let selection
            switch (evt.type) {
              case 'contextmenu':
                evt.cancelBubble = true
                this.clearAllSelection()
                selection = this.selectionList.find(item => item.selectionid === shape.getAttr('selectionid'))
                this.$emit('pdf-contextmenu', evt.evt, selection)
                break
            }
          })
          group.add(shape)

          let config = {
            x: 0,
            y: 0,
            width: allWords[item].width,
            height: allWords[item].height
          }
          if (type === 'rect') {
            config.stroke = color
            config.strokeWidth = 3
            config.opacity = 1
          } else if (type === 'underline') {
            config.stroke = '#00000000'
            config.strokeWidth = 3
            config.opacity = 1
          } else {
            config.fill = color
            config.opacity = 0.2
          }
          let rect = new Konva.Rect(config)
          shape.add(rect)
          if (type === 'underline') {
            shape.add(new Konva.Rect({
              x: 0,
              y: config.height - 3,
              width: config.width,
              height: 0,
              strokeWidth: 3,
              stroke: color
            }))
          }
        })

        this.pdfLayer.draw()
      },
      /*
      * 绘制选区
      */
      drawSelectionRect (startWord, endWord, bgColor = '#5974ab') {
        let allWords = this.getAllWordsFromWordA2WordB(startWord, endWord)
        let names = Object.keys(allWords)
        this.pdfStage.find('.selection').map(child => {
          if (names.indexOf(child.id()) === -1) {
            child.destroy()
          }
        })
        names.map(name => {
          let shape = this.pdfStage.findOne(`#${name}`)
          if (shape) {
            shape.setAttrs({
              x: allWords[name].x,
              y: allWords[name].y,
              width: allWords[name].width,
              height: allWords[name].height,
              text: allWords[name].text,
              start: allWords[name].start,
              end: allWords[name].end
            })
          } else {
            let group = this.pdfStage.findOne(`.${allWords[name].page}`)
            if (!group) return
            shape = new Konva.Rect({
              x: allWords[name].x,
              y: allWords[name].y,
              width: allWords[name].width,
              height: allWords[name].height,
              fill: bgColor,
              // listening: false,
              draggable: false,
              id: name,
              name: 'selection',
              opacity: 0.2,
              text: allWords[name].text,
              start: allWords[name].start,
              end: allWords[name].end
            })
            group.add(shape).draw()
          }
        })
        this.pdfLayer.draw()
      },

      // onTap (evt) {
      //   if (evt.pointerType === 'pen' || (evt.pointerType === 'mouse' && this.isSelect)) {
      //     let currentWord = this.getCurrentWord()
      //     if (currentWord) {
      //       if (evt.srcEvent.shiftKey) {
      //         this.drawSelectionRect(this.lastWord, currentWord)
      //         return
      //       } else {
      //         this.lastWord = currentWord
      //       }
      //     }
      //   }
      //
      //   this.stopInertiaMove = true
      //   this.clearAllSelection()
      // },
      // onPinch (evt) {
      //   if (evt.type === 'pinchstart') this.tempScale = this.scale || 1
      //   this.scale = evt.scale * this.tempScale
      //   this.changeScale()
      // },
      // onPan (evt) {
      //   this.stopInertiaMove = true
      //   if ((evt.pointerType === 'mouse' && this.isSelect) || evt.pointerType === 'pen') {
      //     let pointerPosition = this.pdfStage.getPointerPosition()
      //     if (pointerPosition) {
      //       if (pointerPosition.x < 0 || pointerPosition.y < 0 ||
      //         pointerPosition.x > this.pdfStage.width() || pointerPosition.y > this.pdfStage.height()) {
      //         pointerPosition = undefined
      //       }
      //     }
      //     if (!pointerPosition) {
      //       if (this.outCanvas === 'top') {
      //         this.scrollView(false)
      //       } else if (this.outCanvas === 'bottom') {
      //         this.scrollView(true)
      //       }
      //     } else {
      //       this.lastPointerPositionX = pointerPosition.x
      //       this.lastPointerPositionY = pointerPosition.y
      //     }
      //     if (evt.type === 'panstart') {
      //       this.firstScreenX = evt.srcEvent.screenX
      //       this.firstScreenY = evt.srcEvent.screenY
      //       this.clearAllSelection()
      //     }
      //     let currentWord = this.getCurrentWord()
      //     if (!currentWord) return
      //     if (!this.firstWord) this.firstWord = currentWord
      //
      //     this.drawSelectionRect(this.firstWord, currentWord)
      //
      //     if (evt.isFinal) {
      //       this.firstWord = ''
      //       this.$emit('pdf-select', evt.srcEvent, this.getSelection())
      //     }
      //     return
      //   }
      //   if (evt.type === 'panstart') {
      //     this.tempTop = this.currentTop
      //     this.tempLeft = this.currentLeft
      //     this.clearAllSelection()
      //   }
      //   this.currentTop = this.tempTop - evt.deltaY / this.scale
      //   this.currentLeft = this.tempLeft - evt.deltaX / this.scale
      //   this.locateScrollBarPosition()
      //   this.scrollStage()
      //   if (evt.isFinal) {
      //     this.stopInertiaMove = false
      //     this.autoScrollView(this.lastVelocityY, this.lastVelocityX)
      //   } else {
      //     this.lastVelocityY = evt.velocityY
      //     this.lastVelocityX = evt.velocityX
      //   }
      // },
      autoScrollView (vy, vx) {
        let startTime = Date.now()
        let startY = this.currentTop
        let startX = this.currentLeft
        let diry = vy > 0 ? -1 : 1 // 加速度方向
        let dirx = vx > 0 ? -1 : 1 // 加速度方向
        let k = 0.003
        let ay = diry * k // 加速度
        let ax = dirx * k // 加速度
        let inertiaMove = () => {
          if (this.stopInertiaMove) return
          let t = Date.now() - startTime
          let nowVy = vy + t * ay
          let nowVx = vx + t * ax
          // 速度方向变化表示速度达到 0 了
          let moveY = 0
          let moveX = 0

          if (diry * nowVy < 0) moveY = vy * t + ay * (t ** 2) / 2
          if (dirx * nowVx < 0) moveX = vx * t + ax * (t ** 2) / 2

          if (!(moveY || moveX)) return

          if (moveY) {
            this.currentTop = startY - moveY / this.scale
          }
          if (moveX) {
            this.currentLeft = startX - moveX / this.scale
          }

          this.locateScrollBarPosition()

          this.scrollStage()

          setTimeout(inertiaMove, 10)
        }

        setTimeout(inertiaMove, 10)
      },

      updateContainerBoxCursor () {
        if (this.cursorType === 'select') {
          this.containerBox.style.cursor = 'text'
        } else if (this.cursorType === 'hand') {
          this.containerBox.style.cursor = `grab`
        }
      },

      /**
       * 滚动舞台
       */
      async scrollStage (isSynchronization = false) {
        try {
          if (isSynchronization) {
            await this.cacheImage()
            await this.loadPages()
            this.updatePages()
          } else {
            this.cacheImage()
            this.loadPages()
            this.updatePages()
          }
          this.$emit('loaded', this.currentPage)
        } catch (e) {
          console.error(e)
        }
      },

      WbarScroll (evt) {
        let thumbW = this.thumbW
        let scrollWbar = this.scrollWbar
        let thumbStartX = Number(thumbW.offsetLeft)
        let mouseStartX = evt.screenX
        let maxX = scrollWbar.offsetWidth - thumbW.offsetWidth

        let pointermove = evt => {
          let deltaX = evt.screenX - mouseStartX
          let _thumbStartX = thumbStartX + deltaX
          if (_thumbStartX < 0) {
            _thumbStartX = 0
          } else if (_thumbStartX > maxX) {
            _thumbStartX = maxX
          }
          thumbW.style.left = _thumbStartX + 'px'

          this.currentLeft = _thumbStartX / maxX * this.totalWidth - this.totalWidth / 2

          this.scrollStage()
        }
        let pointerup = () => {
          window.removeEventListener('pointermove', pointermove)
          window.removeEventListener('pointerup', pointerup)
        }
        window.addEventListener('pointerup', pointerup)
        window.addEventListener('pointermove', pointermove)
      },
      HbarScroll (evt) {
        // let stage = this.$refs.stage
        let thumbH = this.thumbH
        let scrollHbar = this.scrollHbar
        let thumbStartY = Number(thumbH.offsetTop)
        let mouseStartY = evt.screenY
        let maxY = scrollHbar.offsetHeight - thumbH.offsetHeight

        let pointermove = evt => {
          let deltaY = evt.screenY - mouseStartY
          let _thumbStartY = thumbStartY + deltaY
          if (_thumbStartY < 0) {
            _thumbStartY = 0
          } else if (_thumbStartY > maxY) {
            _thumbStartY = maxY
          }
          thumbH.style.top = _thumbStartY + 'px'

          let tip = this.tip

          tip.style.top = _thumbStartY + thumbH.offsetHeight / 2 - 20 + 'px'

          this.currentTop = this.totalHeight * _thumbStartY / maxY

          // this.scrollStage()
        }
        let pointerup = () => {
          window.removeEventListener('pointermove', pointermove)
          window.removeEventListener('pointerup', pointerup)

          this.scrollStage(true)
        }
        window.addEventListener('pointerup', pointerup)
        window.addEventListener('pointermove', pointermove)
      },

      /**
       * 刷新滚动条样式
       */
      refreshThumbStyle () {
        this.$nextTick(() => {
          let width = this.pdfStage.width()
          let height = this.pdfStage.height()
          let scrollHbar = this.scrollHbar
          let thumbH = this.thumbH
          if (!scrollHbar || !thumbH) return
          let _h = scrollHbar.offsetHeight
          this.currentTop = this.totalHeight * this.oldProgress
          if (this.totalCount) _h = height / (this.stageSize.height * this.scale * this.totalCount) * scrollHbar.offsetHeight
          thumbH.style.height = '0'
          if (_h < scrollHbar.offsetHeight) {
            thumbH.style.minHeight = '10px'
            thumbH.style.height = _h + 'px'
          } else {
            thumbH.style.minHeight = '0'
            this.currentTop = 0
          }

          // 水平滚动条
          let scrollWbar = this.scrollWbar
          let thumbW = this.thumbW
          let _w = scrollWbar.offsetWidth
          if (this.totalCount) _w = width / (this.stageSize.width * this.scale) * scrollWbar.offsetWidth
          thumbW.style.width = '0'
          if (_w < scrollWbar.offsetWidth) {
            thumbW.style.minWidth = '10px'
            thumbW.style.width = _w + 'px'
          } else {
            thumbW.style.minWidth = '0'
            this.currentLeft = 0
          }

          this.locateScrollBarPosition()
          this.scrollStage()
        })
      },
      /**
       * 根据currentTop、currentLeft确定滚动条的位置
       */
      locateScrollBarPosition () {
        let thumbH = this.thumbH
        let thumbW = this.thumbW
        let scrollHbar = this.scrollHbar
        let scrollWbar = this.scrollWbar
        let tip = this.tip

        if (this.currentTop < 0) {
          this.currentTop = 0
        } else if (this.currentTop > this.totalHeight) this.currentTop = this.totalHeight

        let maxY = scrollHbar.offsetHeight - thumbH.offsetHeight

        let _thumbStartY = this.currentTop * maxY / this.totalHeight

        // 滑块位置
        thumbH.style.top = _thumbStartY + 'px'

        if (thumbH.offsetHeight) {
          // tip位置
          tip.style.visibility = 'visible'
          tip.style.top = _thumbStartY + thumbH.offsetHeight / 2 - 20 + 'px'
        } else {
          tip.style.visibility = 'hidden'
        }

        let maxX = scrollWbar.offsetWidth - thumbW.offsetWidth

        if (this.totalWidth > 0) {
          if (this.currentLeft < -this.totalWidth / 2) {
            this.currentLeft = -this.totalWidth / 2
          } else if (this.currentLeft > this.totalWidth / 2) {
            this.currentLeft = this.totalWidth / 2
          }
        } else {
          this.currentLeft = 0
        }

        // 水平滑块的位置
        thumbW.style.left = maxX * this.currentLeft / this.totalWidth + maxX / 2 + 'px'
      },

      getAllWordsFromWordA2WordB (A, B) {
        if (A.pageIndex > B.pageIndex) {
          [A, B] = [B, A]
        } else if (A.pageIndex === B.pageIndex) {
          if (A.index > B.index) {
            [A, B] = [B, A]
          }
        }
        let _rows = {}

        // AB之间的页
        for (let i = A.pageIndex; i <= B.pageIndex; i++) {
          let cache = this.imageList.find(item => item.page === i)
          let text = cache.text
          let start = 0
          let end = text.words.length - 1
          if (i === A.pageIndex && i === B.pageIndex) {
            start = A.index
            end = B.index
          } else if (i === A.pageIndex) {
            start = A.index
          } else if (i === B.pageIndex) {
            end = B.index
          }
          for (let j = start; j <= end; j++) {
            let word = text.words[j]
            let name = `selection${word.pageIndex}${word.rowIndex < 10 ? '0' + word.rowIndex : word.rowIndex}`
            if (!_rows[name]) {
              _rows[name] = {
                page: word.pageIndex,
                x: word.x1,
                y: word.y1,
                width: 0,
                height: 0,
                text: '',
                start: `${word.pageIndex}-${word.index}`,
                end: ''
              }
            }
            _rows[name].width = word.x2 - _rows[name].x
            _rows[name].height = word.y2 - _rows[name].y
            _rows[name].text += word.text
            _rows[name].end = `${word.pageIndex}-${word.index}`
          }
        }
        return _rows
      },
      getCurrentWord () {
        let currtntShape = this.getCurrtntShape()
        if (!currtntShape) return
        let page
        if (currtntShape.className === 'Image') {
          page = Number(currtntShape.parent.name())
        } else {
          page = Number(currtntShape.name())
        }
        let cache = this.imageList.find(item => item.page === page)
        if (!cache) return
        let text = cache.text
        if (!text.words) text.words = []
        if (!text.rows) text.rows = []

        let pointerPositionInImage = this.getPointerPositionInImage()

        let prevRowIndex = -1
        let minLineHeight = this.stageSize.height
        for (let word of text.words) {
          // 行内
          if (pointerPositionInImage.y >= word.y1 && pointerPositionInImage.y <= word.y2) {
            prevRowIndex = word.rowIndex
            break
          } else {
            // 判断最小间隙
            if (prevRowIndex !== word.rowIndex) {
              // 换行了
              if (pointerPositionInImage.y - word.y2 > 0) {
                // 鼠标上面
                if (pointerPositionInImage.y - word.y2 < minLineHeight) {
                  minLineHeight = pointerPositionInImage.y - word.y2
                  prevRowIndex = word.rowIndex
                }
              } else if (word.y1 - pointerPositionInImage.y > 0) {
                // 鼠标下面
                if (word.y1 - pointerPositionInImage.y < minLineHeight) {
                  minLineHeight = word.y1 - pointerPositionInImage.y
                  prevRowIndex = word.rowIndex
                }
              }
            }
          }
        }
        // 文字行prevRowIndex

        let words = text.rows[prevRowIndex] || []
        for (let word of words) {
          if (pointerPositionInImage.x < word.x1 && word.wordIndex === 0) {
            // console.log('最左边', word)
            return word
          } else if (pointerPositionInImage.x > word.x2 && word.wordIndex === text.rows[prevRowIndex].length - 1) {
            // console.log('最右边', word)
            return word
          } else if (pointerPositionInImage.x >= word.x1 && pointerPositionInImage.x <= word.x2) {
            // console.log('字上面', word)
            return word
          }
        }
        return {}
      },
      getPointerPositionInImage () {
        let currtntShape = this.getCurrtntShape()
        if (!currtntShape) return
        if (currtntShape.className === 'Image') currtntShape = currtntShape.parent
        // let pointerPosition = this.getPointerPosition()

        let pointerPosition = this.gePointerPositionReferToCanvasCenter()

        let rotation = currtntShape.rotation()

        let cx = currtntShape.x()
        let cy = currtntShape.y()

        if (rotation < 0) {
          rotation += 360
        } else if (rotation >= 360) rotation -= 360

        if (rotation === 90) {
          cx = cy
          cy = 0
        } else if (rotation === 180) {
          cy = -cy
        } else if (rotation === 270) {
          cx = -cy
          cy = 0
        }

        rotation = rotation * Math.PI / 180

        let x = pointerPosition.x
        let y = pointerPosition.y

        pointerPosition.x = (x) * Math.cos(rotation) + (y) * Math.sin(rotation)
        pointerPosition.y = -(x) * Math.sin(rotation) + (y) * Math.cos(rotation)

        let newPos = {
          x: pointerPosition.x / this.scale + currtntShape.offsetX() - cx,
          y: pointerPosition.y / this.scale + currtntShape.offsetY() - cy
        }

        return newPos
      },
      getCurrtntShape () {
        let pointerPosition = this.getPointerPosition()
        // let currtntShape = this.pdfStage.getIntersection(pointerPosition)
        let currtntShape = null

        // if (!currtntShape) {
        let delta = pointerPosition.y + this.currentTop * this.scale
        let page = 0
        while ((delta -= this.stageSize.height * this.scale) > 0) page++

        currtntShape = this.pdfStage.findOne(`.${page}`)
        // }

        return currtntShape
      },
      getPointerPosition () {
        let pointerPosition = this.pdfStage.getPointerPosition()
        this.outCanvas = ''

        if (pointerPosition) {
          if (pointerPosition.x < 0 || pointerPosition.y < 0 ||
            pointerPosition.x > this.pdfStage.width() || pointerPosition.y > this.pdfStage.height()) {
            pointerPosition = undefined
          }
        }
        if (!pointerPosition) {
          let x = this.lastPointerPositionX + (event.screenX - this.firstScreenX)
          let y = this.lastPointerPositionY + (event.screenY - this.firstScreenY)
          if (x < 0) {
            x = 0
          } else if (x > this.pdfStage.width()) x = this.pdfStage.width()
          if (y < 0) {
            y = 0
            this.outCanvas = 'top'
          } else if (y > this.pdfStage.height()) {
            y = this.pdfStage.height()
            this.outCanvas = 'bottom'
          }

          pointerPosition = {x: x, y: y}
        }
        return pointerPosition
      },
      gePointerPositionReferToCanvasCenter () {
        let pointerPosition = this.getPointerPosition()
        return {
          x: pointerPosition.x - this.pdfStage.width() / 2,
          y: pointerPosition.y
        }
      },

      /**
       * 跳转页面
       * @param page 页面索引
       */
      async skipPage (page) {
        this.currentTop = this.stageSize.height * page
        this.locateScrollBarPosition()
        await this.scrollStage(true)
      },
      /**
       * 根据页面索引获取需要图片
       * @param pageIndex 页面索引
       */
      getImageByPageIndex (pageIndex) {
        return new Promise(resolve => {
          let cache = this.cacheList.find(item => item.page === pageIndex)
          if (cache) return resolve(cache.img)
          resolve(null)
        })
      },
      /**
       * 加载页面
       */
      async loadPage (page) {
        try {
          if (page < 0) return false
          let shape = this.pdfStage.findOne(`.${page}`)
          if (shape) {
            return false
          }
          let img = await this.getImageByPageIndex(page)
          if (img) {
            // 加载图片
            let shape = new Konva.Group({
              x: -this.currentLeft,
              y: -this.currentTop + this.stageSize.height * page + this.stageSize.height / 2,
              offsetX: this.stageSize.width / 2,
              offsetY: this.stageSize.height / 2,
              width: this.stageSize.width,
              draggable: false,
              height: this.stageSize.height,
              name: `${page}`
            })

            let _img = new Konva.Image({
              x: 0,
              y: 0,
              image: img,
              draggable: false,
              width: this.stageSize.width,
              height: this.stageSize.height
            })
            shape.add(_img)

            this.pdfLayer.add(shape).draw()
          }
          return true
        } catch (e) {
          console.error(e)
        }
      },
      /**
       * 加载需要的页面
       */
      async loadPages () {
        try {
          this.destroyPages()
          let end = this.currentPage + Math.ceil(this.cachePageCount / 2)
          let start = end - this.cachePageCount
          let succ = []
          for (let i = start; i < end; i++) {
            let page = this.pdfStage.findOne(`.${i}`)
            if (page) continue
            let res = await this.loadPage(i)
            if (res) succ.push(i)
          }
        } catch (e) {
          console.error(e)
        }
      },
      /**
       * 销毁不需要的页面
       */
      destroyPages () {
        // 有需要加载的页面，就说明有需要销毁的页面
        let end = this.currentPage + Math.ceil(this.cachePageCount / 2)
        let start = end - this.cachePageCount
        for (let i = 0; i < this.totalCount; i++) {
          let isFirst = true
          // 销毁图片层
          if (i >= start && i < end) isFirst = false
          let res = this.pdfStage.find(`.${i}`)
          res.map(item => {
            if (!isFirst) return (isFirst = true)
            item.destroy()
          })
        }
        this.pdfLayer.draw()
      },
      /**
       * 更新已渲染的页面信息
       */
      updatePages () {
        this.drawSelectionList()
        let end = this.currentPage + Math.ceil(this.cachePageCount / 2)
        let start = end - this.cachePageCount
        for (let i = start; i < end; i++) {
          let page = this.pdfStage.findOne(`.${i}`)
          if (page) {
            page.setAttrs({
              x: -this.currentLeft,
              y: -this.currentTop + this.stageSize.height * i + this.stageSize.height / 2
            })
            this.pdfLayer.draw()
          }
        }
      },
      /**
       * 缓存图片
       */
      async cacheImage () {
        try {
          let end = this.currentPage + Math.ceil(this.cacheImageCount / 2)
          let start = end - this.cacheImageCount
          this.cacheList = this.cacheList.filter(item => item.page >= start && item.page <= end)
          for (let i = start; i <= end; i++) {
            if (i < 0 || i >= this.totalCount) continue
            let cache = this.cacheList.find(item => {
              if (item === undefined) console.log(item, this.cacheList)
              return item.page === i
            })
            if (cache) continue
            if (this.caching[i]) continue
            this.caching[i] = true
            let res = await new Promise(resolve => {
              let img = new Image()
              img.src = this.imageList[i].img
              img.onload = () => {
                if (this.stageSize.width !== img.width && this.stageSize.height !== img.height) {
                  this.stageSize.width = img.width
                  this.stageSize.height = img.height
                  this.handleResize()
                }
                resolve(img)
              }
            })
            delete this.caching[i]

            this.cacheList.push({
              page: this.imageList[i].page,
              img: res
            })
          }
        } catch (e) {
          console.error(e)
        }
      },
      /**
       * 设置舞台大小
       */
      handleResize () {
        let stage = document.querySelector('.stage')
        let width = stage.offsetWidth
        let height = stage.offsetHeight
        this.minScale = height / this.stageSize.height
        this.pdfStage.setAttrs({
          height: height,
          width: width
        }).draw()
        this.setScale(this.scaleType)
        this.updateMaskBound()
      },
      /**
       * 设置缩放
       */
      setScale (scale = 'page') {
        this.scaleType = scale
        let stage = document.querySelector('.stage')
        let width = stage.offsetWidth
        let height = stage.offsetHeight

        let currScale = 1
        if (scale === 'screen') {
          currScale = width / this.stageSize.width
        } else if (scale === 'page') {
          currScale = height / this.stageSize.height
        } else if (scale === 'original') {
          currScale = 1
        } else if (typeof (scale) === 'number') {
          currScale = scale
        }
        this.changeScale(currScale)
      },
      /**
       * 执行缩放
       */
      changeScale (currScale) {
        if (currScale < this.minScale) {
          this.scale = this.minScale
        } else if (currScale > this.maxScale) {
          this.scale = this.maxScale
        } else {
          this.scale = currScale
        }

        this.pdfStage.setAttrs({
          scale: {x: this.scale, y: this.scale},
          offsetX: -this.pdfStage.width() / this.scale / 2
        }).draw()

        this.refreshThumbStyle()
      },
      /**
       * 放大
       */
      zoomIn () {
        let scale = this.scale + 0.1
        this.setScale(scale)
      },
      /**
       * 缩小
       */
      zoomOut () {
        let scale = this.scale - 0.1
        this.setScale(scale)
      },
      /**
       * 执行旋转
       */
      rotatePage (deltaRotation = 0) {
        let page = this.pdfStage.findOne(`.${this.currentPage}`)
        if (!page) return
        let rotation = page.getAttr('rotation') + deltaRotation
        if (rotation < 0) {
          rotation += 360
        } else if (rotation >= 360) rotation -= 360

        if (page) {
          page.setAttrs({
            rotation: rotation
          })
          this.pdfLayer.draw()
        }
      },
      /**
       * 逆时针旋转
       */
      antiClockwise () {
        this.rotatePage(-90)
      },
      /**
       * 顺时针旋转
       */
      clockwise () {
        this.rotatePage(90)
      },

      updateMaskBound () {
        this.$nextTick(() => this.maskBound = getPos(this.innerBox))
      },
      getDefaultContextmenu (contextmenuName = []) {
        if (contextmenuName.constructor === String) {
          contextmenuName = contextmenuName.split(' ')
        } else if (contextmenuName.constructor === Array) {
          if (!contextmenuName.length) contextmenuName = Object.keys(this.defaultContextmenu)
        } else {
          throw new Error('参数类型错误，请检查')
        }

        let resContextmenu = []

        Object.keys(this.defaultContextmenu).map(item => {
          if (contextmenuName.find(_item => _item === item)) {
            if (item === 'copy') {
              let selection = this.getSelection()
              if (!selection.text.length) return
            } else if (item === 'selectAll') {
              if (!this.imageList.length) return
            }
            resContextmenu.push(this.defaultContextmenu[item])
          }
        })
        return resContextmenu
      }
    }
  }

  function getPos (el, pEl) {
    let pos = {x: 0, y: 0}
    do {
      if (el === pEl) break
      pos.x += el.offsetLeft
      pos.y += el.offsetTop
    } while ((el = el.offsetParent))

    pos.height = pEl ? pEl.offsetHeight : window.innerHeight
    pos.width = pEl ? pEl.offsetWidth : window.innerWidth
    return pos
  }
</script>

<style lang="scss" scoped>
  .r-pdf-box {
    height: 100%;
    width: 100%;

    .inner-box {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;

      .r-toolbar {
        height: 30px;
        width: 100%;
        overflow: hidden;
        user-select: none;
        cursor: default;
        position: relative;

        .r-toolbar-item {
          font-size: 14px;
          display: inline-block;
          padding: 0 5px;
          border: 1px solid #ccc;
          box-sizing: border-box;
          height: calc(100% - 10px);
          margin-left: 10px;
          border-radius: 5px;
          margin-top: 5px;

          &:hover {
            background-color: #cccccc;
            color: #fff;
          }

          select {
            height: 100%;
            width: 100%;
            border: none;
            outline: none;
            background-color: transparent;
          }
        }
      }

      .stage_box {
        height: calc(100% - 30px);
        font-size: 0;
        position: relative;

        .stage {
          position: relative;
          display: inline-block;
          height: 100%;
          /*overflow: hidden;*/
          width: 100%;

          .container {
            width: 100%;
            height: 100%;
          }

          &::-webkit-scrollbar-thumb, &::-webkit-scrollbar {
            display: none;
          }

          .scrollHbar {
            width: 17px;
            /*background-color: #000;*/
            display: inline-block;
            position: absolute;
            overflow: hidden;
            user-select: none;
            top: 0;
            right: 0;
            bottom: 17px;
            pointer-events: none;

            .thumbH {
              pointer-events: all;
              position: absolute;
              top: 0;
              width: 17px;
              background-color: #c8c8c8;
              user-select: none;
              cursor: default;
            }
          }

          .scrollWbar {
            height: 17px;
            /*background-color: #000;*/
            display: inline-block;
            position: absolute;
            overflow: hidden;
            user-select: none;
            bottom: 0;
            left: 0;
            right: 17px;
            pointer-events: none;

            .thumbW {
              position: absolute;
              left: 0;
              height: 17px;
              background-color: #c8c8c8;
              user-select: none;
              pointer-events: all;
              cursor: default;
            }
          }

          .tip {
            position: absolute;
            top: -20px;
            right: 27px;
            height: 40px;
            width: 40px;
            background-color: #d6d6d6;
            font-size: 20px;
            text-align: center;
            line-height: 40px;
            border-radius: 50%;
            cursor: default;
            user-select: none;
            visibility: hidden;

            &::after {
              content: ' ';
              position: absolute;
              top: 50%;
              right: -18px;
              transform: translateY(-50%);
              height: 0;
              width: 0;
              border: 10px solid;
              border-color: transparent transparent transparent #d6d6d6;
            }
          }
        }
      }

      .r-pdf-loaging {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: rgba(0, 0, 0, 0.2);

        .circular {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          margin: auto;
          height: 100px;
          width: 100px;
          animation: loading-rotate 2s linear infinite;

          .path {
            animation: loading-dash 1.5s ease-in-out infinite;
            stroke-dasharray: 90, 150;
            stroke-dashoffset: 0;
            stroke-width: 2;
            stroke: #409EFF;
            stroke-linecap: round;
          }
        }
      }

      .r-pdf-select {
        position: fixed;
        background-color: rgba(0, 0, 0, 0.2);

        &.top {
          left: 0;
          top: 0;
        }

        &.right {
          top: 0;
          right: 0;
        }

        &.bottom {
          bottom: 0;
          right: 0;
        }

        &.left {
          bottom: 0;
          left: 0;
        }
      }
    }
  }

  @keyframes loading-rotate {
    100% {
      transform: rotate(360deg)
    }
  }

  @keyframes loading-dash {
    0% {
      stroke-dasharray: 1, 200;
      stroke-dashoffset: 0
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -40px
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -120px
    }
  }
</style>
