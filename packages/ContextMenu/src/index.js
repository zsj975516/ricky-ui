import contextMenu from './ContextMenu.vue'

import Vue from 'vue/dist/vue'

const instance = new (Vue.extend(contextMenu))({
  el: document.createElement('div')
})
document.body.appendChild(instance.$el);

export default instance
