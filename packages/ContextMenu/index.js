import ContextMenu from './src/index.js'

ContextMenu.install = function (Vue) {
  Vue.prototype.$contextmenu = ContextMenu.show
}
export default ContextMenu
