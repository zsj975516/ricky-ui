# Carousel

## 属性

---
|             | 描述              | 类型   |  默认值  | 可选值 |
| --------    | -----            | :---:   | :----:  | :----:|
| width       | 宽度（像素）        | Number |   null   | 
| height      | 高度（像素）        |  Number |   null   |
| animateTime | 动画持续时间(毫秒)   | Number |    500   |
| isHorizontal| 是否为水平方向       | Boolean |   true   | true/false
| autoplay    | 是否自动播放         | Boolean|   true   | true/false
| interval    | 自动播放切换时间(毫秒)| Number |   3000   |
---

## 方法

---
|             | 描述              | 参数   | 
| --------    | -----            | ---   | 
| prev       | 切换至上一张幻灯片  | 需要切换的幻灯片的索引，从 0 开始 |   
| next      | 切换至下一张幻灯片    |   |  
| setActiveItem | 手动切换幻灯片   |  |  
---

## 事件

---
|             | 描述              | 回调参数   | 
| --------    | -----            | ---   | 
| change       | 幻灯片切换时触发  | 目前激活的幻灯片的索引，原幻灯片的索引 |   
---
