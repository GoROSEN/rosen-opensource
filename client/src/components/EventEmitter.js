export class SubscriptionPublish {
  constructor() {
    this.eventMap = {}
  }

  /**
   * 订阅函数
   * @param key 订阅事件Key值
   * @param handler 订阅事件
   */
  on(key, handler) {
    if (!this.eventMap[key]) {
      this.eventMap[key] = []
    }
    this.eventMap[key].push(handler)
  }

  /**
   * 发布函数
   * @param key 订阅事件Key值
   * @param params 要发步到订阅事件中的参数
   */
  emit(key, params) {
    if (this.eventMap[key]) {
      this.eventMap[key].forEach(handler => {
        handler(params)
      })
    }
  }

  /**
   * 销毁函数
   * @param key
   * @param handler
   */
  remove(key, handler) {
    if (this.eventMap[key]) {
      // 如果该队列存在，先找到要删除函数的位置，然后剔除
      const res = this.eventMap[key].indexOf(handler)
      res !== -1 && this.eventMap[key].splice(res, 1)
    }
  }
}

// 创建一个全局实例
const defaultEvent = new SubscriptionPublish()

export default defaultEvent
