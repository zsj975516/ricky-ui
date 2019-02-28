export default class Animate {
  constructor (from) {
    this._from = from
  }

  to (to, time) {
    this._to = to
    this._time = time
  }

  onUpdate (onUpdate) {
    this._onUpdate = onUpdate
  }

  onComplete (onComplete) {
    this._onComplete = onComplete
  }

  start () {
    let intervalTime = 17
    let _count = Math.round(this._time / intervalTime)
    let currCount = 0
    let fn = () => {
      setTimeout(() => {
        currCount++
        if (currCount <= _count) {
          let obj = {}
          for (let key in this._from) {
            obj[key] = this._from[key] + (this._to[key] - this._from[key]) * currCount / _count
          }
          if (this._onUpdate) this._onUpdate(obj)
          fn()
        } else {
          if (this._onComplete) this._onComplete()
        }
      }, intervalTime)
    }
    fn()
  }
}
