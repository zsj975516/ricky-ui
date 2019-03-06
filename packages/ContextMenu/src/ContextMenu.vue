<template>
  <div class="rootNode"
       ref="rootNode"
       :class="{hide:!isShow}"
       @pointerdown.stop.prevent="{}">
    <div @click="handleClick(item,$event)"
         @pointerdown.stop.prevent="{}"
         v-show="item.show"
         :key="index"
         v-for="(item,index) in contextmenu">
      <img :src='item.icon' :class="{box_show:item.icon}">
      <span>{{item.label}}</span>
    </div>
  </div>
</template>
<script>
  export default {
    // name: 'ContextMenu',
    data () {
      return {
        contextmenu: [],
        isShow: false
      }
    },
    methods: {
      handleClick (item, ev) {
        item.click(ev)
        this.hide()
      },
      hide (ev) {
        this.isShow = false
        // 移除事件
        window.removeEventListener('wheel', this.disableWheel)
        window.removeEventListener('blur', this.hide)
        window.removeEventListener('pointerdown', this.hide)
      },
      disableWheel (ev) {
        ev.preventDefault()
      },
      show (contextmenu = []) {
        let ev = window.event
        // 验证参数
        let res = contextmenu.every((value, index) => {
          // 参数必须包含，label，和click，且click必须是方法
          return value.hasOwnProperty('label') && value.hasOwnProperty('click') && (typeof value.click === 'function')
        })
        if (!res) throw new Error('请检查参数是否正确')
        let x = ev.screenX - window.screenX + 5
        let y = ev.screenY - window.screenY - (window.outerHeight - window.innerHeight)
        let el = this.$refs.rootNode
        this.isShow = true
        this.contextmenu = contextmenu
        this.$nextTick(() => {
          // 菜单超出了窗体
          if (y > window.outerHeight - el.offsetHeight - 15) y = y - el.offsetHeight
          if (x > window.outerWidth - el.offsetWidth - 15) x = window.outerWidth - el.offsetWidth - 15
          el.style.top = y + 'px'
          el.style.left = x + 'px'
        })
        // 绑定事件
        // 窗体失去焦点事件
        window.addEventListener('blur', this.hide)
        // 禁用滚轮事件
        window.addEventListener('wheel', this.disableWheel)
        // 隐藏右键菜单
        window.addEventListener('pointerdown', this.hide)
      }
    }
  }
</script>

<style scoped>

  .rootNode * {
    user-select: none;
    cursor: default;
  }

  .rootNode {
    position: fixed;
    background: white;
    box-shadow: #8f8f8f 0 0 9px 1px;
    top: 74px;
    z-index: 2147483647;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .rootNode div {
    font-size: 13px;
    height: 28px;
    line-height: 28px;
    min-width: 120px;
    border: 1px #ddd solid;
    padding-left: 12px;
    padding-right: 12px;
    position: relative;
    overflow: hidden;
  }

  .rootNode div img {
    vertical-align: text-bottom;
    height: 15px;
    width: 15px;
    margin-right: 5px;
    visibility: hidden;
  }
  .rootNode div img.box_show {
    visibility: visible;
  }

  .rootNode div:hover {
    background: #288ed3;
    color: white;
  }

  .rootNode.hide *,
  .rootNode.hide {
    visibility: hidden !important;
  }
</style>
