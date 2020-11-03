// 主颜色
let $mainColor = 'FF5B78'
// 弹窗图标url "/" 相当于项目根目录（cli 创建的项目为 src）
let $iconUrl = ''

export default class Pushy {
  constructor(options = {}) {
    /**
     * @name 发布订阅
     */
    // 缓存列表
    this.list = {}

    // 当前应用的APPID
    this.appid = ''
    // 原生版本名:string
    this.nativeVersion = ''
    //  原生版本号:number
    this.nativeVersionCode = 0
    // wgt 资源版本
    this.wgtVersion = ''
    // wgt 资源版本号
    this.wgtVersionCode = 0
    // 是否初始化完成
    this._isInitFinish = false
    // 系统信息
    this.systemInfo = {}
    // state
    this.state = {
      // 是否正在检查更新
      isGettingUpdate: false,
      // 是否正在静默更新
      isSlientUpdating: false,
      // 是否已经静默更新
      isSlientUpdated: false,
    }

    // 个人配置
    this._config = {
      // 项目id
      projectId: '',
      // 是否打开检查更新
      update: true,
      // 检查更新地址
      updateUrl: '',
      // 是否显示log
      log: true,
    }

    // 生效的配置
    this._workSetting = {}

    // 合并用户设置
    this.setConfig(options)
  }

  /**
   * @name 发布订阅
   */
  // 订阅
  on(event, fn) {
    // 如果对象中没有对应的 event 值，也就是说明没有订阅过，就给 event 创建个缓存列表
    // 如有对象中有相应的 event 值，把 fn 添加到对应 event 的缓存列表里
    ;(this.list[event] || (this.list[event] = [])).push(fn)
    return this
  }
  // 监听一次
  once(event, fn) {
    // 先绑定，调用后删除
    const _this = this

    function on() {
      _this.off(event, on)
      fn.apply(_this, arguments)
    }
    on.fn = fn
    _this.on(event, on)
    return _this
  }
  // 取消订阅
  off(event, fn) {
    const _this = this
    const fns = _this.list[event]
    // 如果缓存列表中没有相应的 fn，返回false
    if (!fns) return false
    if (!fn) {
      // 如果没有传 fn 的话，就会将 event 值对应缓存列表中的 fn 都清空
      fns && (fns.length = 0)
    } else {
      // 若有 fn，遍历缓存列表，看看传入的 fn 与哪个函数相同，如果相同就直接从缓存列表中删掉即可
      let cb
      for (let i = 0, cbLen = fns.length; i < cbLen; i++) {
        cb = fns[i]
        if (cb === fn || cb.fn === fn) {
          fns.splice(i, 1)
          break
        }
      }
    }
    return _this
  }
  // 发布
  emit() {
    const _this = this
    // 第一个参数是对应的 event 值，直接用数组的 shift 方法取出
    const event = [].shift.call(arguments)
    // 如果缓存列表里没有 fn 就返回 false
    if (!_this.list[event]) {
      return false
    }

    // const fns = [..._this.list[event]]
    // // 如果缓存列表里没有 fn 就返回 false
    // if (!fns || fns.length === 0) {
    //   return false
    // }
    // 遍历 event 值对应的缓存列表，依次执行 fn
    _this.list[event].forEach(fn => {
      fn.apply(_this, arguments)
    })
    return _this
  }

  /**
   * @name 初始化设置方法，该方法内无法发布事件
   * @param { Object } options
   * @return { Void }
   */
  setConfig(options) {
    // 公开可重写的设置key
    const _publicSettings = [
      'projectId',
      'update',
      'updateUrl',
      'log',
      'mainColor',
      'logo',
    ]
    // 合并传入的设置对象，如果传入了非公开设置的key会被丢弃
    const _workSetting = {}
    for (const item of Object.keys(options)) {
      if (_publicSettings.includes(item)) {
        _workSetting[item] = options[item]
      }
    }
    if (_workSetting.mainColor) {
      $mainColor = _workSetting.mainColor
    }
    if (_workSetting.logo) {
      $iconUrl = _workSetting.logo
    }
    // 合并设置对象
    Object.assign(this._config, _workSetting)
    // 给出生效设置对象
    Object.assign(this._workSetting, _workSetting)
  }

  /**
   * @name 初始化请求参数
   * @return { Promise<Boolean> }
   */
  init() {
    return new Promise(resolve => {
      // 获取原生版本参数
      const { appid, version, versionCode } = plus.runtime
      // appid
      this.appid = appid
      // 原生版本
      this.nativeVersion = version
      // 原生版本号
      this.nativeVersionCode = Number(versionCode)
      // 系统信息
      this.systemInfo = uni.getSystemInfoSync()

      // 读取 wgt 版本号
      plus.runtime.getProperty(appid, res => {
        const { version, versionCode } = res
        this.wgtVersion = version
        this.wgtVersionCode = Number(versionCode)
        /**
         * @description 这里 uni-app 有个 bug 在 ios versionCode 始终返回 ipa 的 versionCode ，无法获取 wgt 的版本号，可以获取版本名。
         * 上传资源版本名贺版本号一定要对应，版本名 x.y.z:string, 版本号 xyz:number
         * uni-app 更新日志已经修复，等待测试
         */
        // if (this.systemInfo.platform === 'android') {
        //   this.wgtVersionCode = Number(versionCode)
        // } else {
        //   this.wgtVersionCode = Number(version.split('.').join(''))
        // }
        // 获取设备信息
        plus.device.getInfo({
          success: deviceInfo => {
            this.systemInfo.uuid = deviceInfo.uuid
          },
          fail: e => {
            console.error(e)
          },
          complete: () => {
            // 初始化成功
            this._isInitFinish = true
            // 发布 onInitFinish 事件
            this.emit('onInitFinish')
            // 成功返回
            resolve(true)
          },
        })
      })
    })
  }

  /**
   * 获取资源信息
   */
  async getInfo() {
    // 判断是否初始化
    if (!this._isInitFinish) {
      // 没有初始化进行初始化
      await this.init()
    }

    return Promise.resolve({
      // 当前应用的APPID
      appid: this.appid,
      // 原生版本名:string
      nativeVersion: this.nativeVersion,
      //  原生版本号:number
      nativeVersionCode: this.nativeVersionCode,
      // wgt 资源版本
      wgtVersion: this.wgtVersion,
      // wgt 资源版本号
      wgtVersionCode: this.wgtVersionCode,
      // 系统信息
      systemInfo: this.systemInfo,
      // 个人配置
      _config: this._config,
      // 生效的配置
      _workSetting: this._workSetting,
    })
  }

  /**
   * @name 检查更新，只会 resolve， 不会 reject
   * @return { Promise<object> } 包装的结果对象，
   * `statusCode` <Number> 状态码，执行该方法之后的结果主要根据状态码进行判断
   * 251：需要更新原生版本 data、response、message
   * 252：需要更新wgt版本 data、response、message
   * 253：暂无更新 response、message
   * 254：请求成功，但接口响应返回失败 response、message
   * 451: 更新被关闭，用户手动配置关闭了 message
   * 452：用户未配置更新地址 message
   * 453：无项目ID或项目ID不正确 message
   * 473：正在检查更新 message
   * 474：正在静默更新 message
   * 475：已经静默更新完成，需要重启App生效 message
   * 500：请求失败 message、error
   * 505：占位，应该不会返回这个
   * `message` 	<String> 信息描述
   * `data` 		<Object> native 或者 wgt 包信息
   * `response` <Object> 原生响应对象
   * `error` 		<Error> 原生错误对象
   * @desc 25x 接口状态 45x 用户配置 47x pushy状态 500 错误
   * @return { Promise<object> } 包装的响应对象
   */
  async getUpdate() {
    // 判断是否初始化
    if (!this._isInitFinish) {
      // 没有初始化进行初始化
      await this.init()
    }

    if (this.state.isGettingUpdate) {
      // 判断是否正在更新
      return Promise.resolve({
        statusCode: 473,
        message: '正在更新中',
      })
    } else if (this.state.isSlientUpdating) {
      // 判断是否正在静默更新
      return Promise.resolve({
        statusCode: 474,
        message: '正在静默更新',
      })
    } else if (this.state.isSlientUpdated) {
      // 判断是否已经静默更新
      return Promise.resolve({
        statusCode: 475,
        message: '已经静默更新完成，需要重启App生效',
      })
    }
    const { update, updateUrl, projectId } = this._config
    // 条件判断
    if (!update) {
      return Promise.resolve({
        statusCode: 451,
        message: '更新被关闭',
      })
    } else if (!updateUrl) {
      return Promise.resolve({
        statusCode: 452,
        message: '无检查更新地址',
      })
    } else if (!projectId) {
      return Promise.resolve({
        statusCode: 453,
        message: '无项目ID或项目ID不正确',
      })
    }

    // 打开正在更新
    this.state.isGettingUpdate = true

    // 发布 onStartGetUpdate - 开始检查更新
    this.emit('onStartGetUpdate')

    // 提示检查更新
    // toast(this._config.gettingUpdateTips)
    // 网络请求
    const res = await this.onRequestUpdate()
    // 关闭正在更新
    this.state.isGettingUpdate = false
    // 根据 statusCode 处理结果
    switch (res.statusCode) {
      case 251:
        // 251：需要更新原生版本
        // 发布需要更新原生版本事件
        this.emit('onNativeUpdateRequired')
        this.startUpdate(res.data)
        return Promise.resolve(res)
      case 252:
        // 252：需要更新wgt版本
        // 发布需要更新wgt版本事件
        this.emit('onWgtUpdateRequired')
        this.startUpdate(res.data)
        return Promise.resolve(res)
      case 253:
        // 253：暂无更新
        // 发布 onNoUpdate - 暂无更新
        this.emit('onNoUpdate')
        this._config.log &&
          console.log('Uni-pushy：暂无新版本，接口响应 >>>', res.response)
        this._config.log &&
          console.log('Uni-pushy：暂无新版本，本地版本 >>>', res.info)
        // resolve(false)
        return Promise.resolve(res)
      case 254:
        // 254：请求成功，但返回失败
        this._config.log &&
          console.log('Uni - pushy：success: false >>>>>>>>>', res.response)
        return Promise.resolve(res)
      case 500:
        // 500：请求失败，查看返回对象 message 获取错误详情描述 error：原生错误对象
        this._config.log &&
          console.log('Uni - pushy：500: false >>>>>>>>>', res.error)
        return Promise.resolve(res)
      default:
        return Promise.resolve({
          statusCode: 505,
          message: '应该不会返回这个',
        })
    }
  }

  /**
   * @name 启动更新，支持wgt更新，原生更新，静默更新
   */
  async startUpdate(res) {
    const { platform } = this.systemInfo
    /**
     * updateType 更新类型（1：用户同意更新，2：强制更新，3：静默更新）
     */
    const { url, updateType } = res

    switch (updateType) {
      case 1:
        // 用户同意更新
        updatePopup(res, () => {
          if (/\.wgt$/i.test(url) || platform === 'android') {
            getDownload(res)
          } else {
            plus.runtime.openURL(url)
          }
        })
        break

      case 2:
        // 强制更新
        if (/\.wgt$/i.test(url) || platform === 'android') {
          getDownload(res)
        } else {
          plus.runtime.openURL(url)
        }
        break

      case 3:
        // 静默更新
        this.state.isSlientUpdating = true
        this.handleUpdateSilent(res)
        break

      default:
        break
    }
  }

  /**
   * @name 请求服务器版本号，只做网络请求，返回数据，不做任何逻辑处理,已经封装 Promise 不会触发 reject
   *
   * statusCode：
   * 251：需要更新原生版本
   *    message：string 详情描述
   *    response 原生响应对象
   *    data native包
   * 252：需要更新wgt版本
   *    message：string 详情描述
   *    response 原生响应对象
   *    data wgt包
   * 253：暂无更新
   *    message：string 详情描述
   *    response 原生响应对象
   * 254：请求成功，但返回失败
   *    message：string 详情描述
   *    response 原生响应对象
   * 500：请求失败
   *    message：string 详情描述
   *    error：原生错误对象
   * @return { Promise<object> } 包装的响应对象
   */
  async onRequestUpdate() {
    return new Promise(resolve => {
      const { platform } = this.systemInfo
      const { updateUrl, projectId } = this._config

      const {
        wgtVersion,
        wgtVersionCode,
        nativeVersion,
        nativeVersionCode,
        systemInfo,
      } = this

      uni.request({
        url: `${updateUrl}/api/update`,
        method: 'POST',
        data: {
          projectId,
          wgtVersion,
          wgtVersionCode,
          nativeVersion,
          nativeVersionCode,
          platform,
          systemInfo,
        },
        success: res => {
          const data = res.data
          if (data.success) {
            const { wgt, native } = data.data
            if (native && native.versionCode > nativeVersionCode) {
              resolve({
                statusCode: 251,
                data: native,
                message: '需要更新原生版本',
                response: data,
              })
            } else if (
              wgt &&
              wgt.nativeVersionCode === nativeVersionCode &&
              wgt.versionCode > wgtVersionCode
            ) {
              resolve({
                statusCode: 252,
                data: wgt,
                message: '需要更新wgt版本',
                response: data,
              })
            } else {
              resolve({
                statusCode: 253,
                message: '暂无更新',
                response: data,
              })
            }
          } else {
            resolve({
              statusCode: 254,
              message: data.message,
              response: data,
            })
          }
        },
        fail: e => {
          resolve({
            statusCode: 500,
            message: e.message,
            error: e,
          })
        },
      })
    })
  }

  /**
   * @name 静默更新
   */
  async handleUpdateSilent(res) {
    const { url } = res

    // 创建下载对象
    const dtask = plus.downloader.createDownload(
      url,
      {
        // 保存文件路径仅支持以"_downloads/"、"_doc/"、"_documents/"开头的字符串。 文件路径以文件后缀名结尾（如"_doc/download/a.doc"）表明指定保存文件目录及名称，以“/”结尾则认为指定保存文件的目录（此时程序自动生成文件名）。 如果指定的文件已经存在，则自动在文件名后面加"(i)"，其中i为数字，如果文件名称后面已经是此格式，则数字i递增，如"download(1).doc"。 默认保存目录为（"_downloads"），并自动生成文件名称。
        filename: '_doc/update/',
        // 数值类型，单位为s(秒)，默认值为120s。 超时时间为服务器响应请求的时间（不是下载任务完成的总时间），如果设置为0则表示永远不超时。
        timeout: 60,
        // 数值类型，默认为重试3次。
        retry: 3,
        // 下载任务重试间隔时间 数值类型，单位为s(秒)，默认值为30s。
        retryInterval: 30,
      },
      // 当下载任务下载完成时触发，成功或失败都会触发。
      (download, status) => {
        if (status == 200) {
          plus.runtime.install(
            download.filename,
            {
              // 是否强制安装
              force: false,
            },
            () => {
              this.state.isSlientUpdating = false
              this.state.isSlientUpdated = true
              this._config.log && console.log('Uni-pushy：静默更新完成 >>>')
            },
            e => {
              this.state.isSlientUpdating = false
              plus.nativeUI.alert('安装文件失败[' + e.code + ']：' + e.message)
            },
          )
        } else {
          this.state.isSlientUpdating = false
          // toast('静默更新文件下载失败...')
        }
      },
    )

    // 启动下载对象
    dtask.start()

    // 添加下载监听
    dtask.addEventListener('statechanged', (download, status) => {
      switch (download.state) {
        case 1:
          // 开始
          this._config.log && console.log('Uni-pushy：下载任务开始请求')
          break
        case 2:
          // 已连接到服务器
          this._config.log &&
            console.log(
              'Uni-pushy：下载任务网络连接已建立，服务器返回响应，准备传输数据内容。',
            )
          break
        case 3:
          // 下载中...
          // const progress = parseInt(
          //   (download.downloadedSize / download.totalSize) * 100,
          // )
          // console.log(`Uni-pushy：下载中...：${progress}%`)
          break
        case 4:
          // 下载任务已完成
          this._config.log && console.log(`Uni-pushy：下载任务已完成`)
          break
      }
    })
  }
}

// 从服务器下载应用资源包（wgt文件）
const getDownload = function (res) {
  const { url } = res

  let popupData = {
    progress: true,
    buttonNum: 2,
  }
  // if (isForceUpdate) {
  //   popupData.buttonNum = 0
  // }
  let dtask
  let lastProgressValue = 0
  let popupObj = downloadPopup(popupData)
  dtask = plus.downloader.createDownload(
    url,
    {
      filename: '_doc/update/',
    },
    function (download, status) {
      if (status == 200) {
        popupObj.change({
          progressValue: 100,
          progressTip: '正在安装文件...',
          progress: true,
          buttonNum: 0,
        })
        plus.runtime.install(
          download.filename,
          {},
          function () {
            popupObj.change({
              contentText: '应用资源更新完成！',
              buttonNum: 1,
              progress: false,
            })
          },
          function (e) {
            popupObj.cancel()
            plus.nativeUI.alert('安装文件失败[' + e.code + ']：' + e.message)
          },
        )
      } else {
        popupObj.change({
          contentText: '文件下载失败...',
          buttonNum: 1,
          progress: false,
        })
      }
    },
  )
  dtask.start()
  dtask.addEventListener('statechanged', function (task, status) {
    switch (task.state) {
      case 1: // 开始
        popupObj.change({
          progressValue: 0,
          progressTip: '准备下载...',
          progress: true,
        })
        break
      case 2: // 已连接到服务器
        popupObj.change({
          progressValue: 0,
          progressTip: '开始下载...',
          progress: true,
        })
        break
      case 3:
        const progress = parseInt((task.downloadedSize / task.totalSize) * 100)
        if (progress - lastProgressValue >= 2) {
          lastProgressValue = progress
          popupObj.change({
            progressValue: progress,
            progressTip: '已下载' + progress + '%',
            progress: true,
          })
        }
        break
    }
  })
  // 取消下载
  popupObj.cancelDownload = function () {
    dtask && dtask.abort()
    uni.showToast({
      title: '已取消下载',
      icon: 'none',
    })
  }
  // 重启APP
  popupObj.reboot = function () {
    plus.runtime.restart()
  }
}
// 文字换行
function drawtext(text, maxWidth) {
  let textArr = text.split('')
  let len = textArr.length
  // 上个节点
  let previousNode = 0
  // 记录节点宽度
  let nodeWidth = 0
  // 文本换行数组
  let rowText = []
  // 如果是字母，侧保存长度
  let letterWidth = 0
  // 汉字宽度
  let chineseWidth = 14
  // otherFont宽度
  let otherWidth = 7
  for (let i = 0; i < len; i++) {
    if (/[\u4e00-\u9fa5]|[\uFE30-\uFFA0]/g.test(textArr[i])) {
      if (letterWidth > 0) {
        if (nodeWidth + chineseWidth + letterWidth * otherWidth > maxWidth) {
          rowText.push({
            type: 'text',
            content: text.substring(previousNode, i),
          })
          previousNode = i
          nodeWidth = chineseWidth
          letterWidth = 0
        } else {
          nodeWidth += chineseWidth + letterWidth * otherWidth
          letterWidth = 0
        }
      } else {
        if (nodeWidth + chineseWidth > maxWidth) {
          rowText.push({
            type: 'text',
            content: text.substring(previousNode, i),
          })
          previousNode = i
          nodeWidth = chineseWidth
        } else {
          nodeWidth += chineseWidth
        }
      }
    } else {
      if (/\n/g.test(textArr[i])) {
        rowText.push({
          type: 'break',
          content: text.substring(previousNode, i),
        })
        previousNode = i + 1
        nodeWidth = 0
        letterWidth = 0
      } else if (textArr[i] == '\\' && textArr[i + 1] == 'n') {
        rowText.push({
          type: 'break',
          content: text.substring(previousNode, i),
        })
        previousNode = i + 2
        nodeWidth = 0
        letterWidth = 0
      } else if (/[a-zA-Z0-9]/g.test(textArr[i])) {
        letterWidth += 1
        if (nodeWidth + letterWidth * otherWidth > maxWidth) {
          rowText.push({
            type: 'text',
            content: text.substring(previousNode, i + 1 - letterWidth),
          })
          previousNode = i + 1 - letterWidth
          nodeWidth = letterWidth * otherWidth
          letterWidth = 0
        }
      } else {
        if (nodeWidth + otherWidth > maxWidth) {
          rowText.push({
            type: 'text',
            content: text.substring(previousNode, i),
          })
          previousNode = i
          nodeWidth = otherWidth
        } else {
          nodeWidth += otherWidth
        }
      }
    }
  }
  if (previousNode < len) {
    rowText.push({
      type: 'text',
      content: text.substring(previousNode, len),
    })
  }
  return rowText
}
// 是否更新弹窗
function updatePopup(res, callback) {
  const { version, changelog } = res
  // 弹窗遮罩层
  let maskLayer = new plus.nativeObj.View('maskLayer', {
    //先创建遮罩层
    top: '0px',
    left: '0px',
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  })
  // 以下为计算菜单的nview绘制布局，为固定算法，使用者无关关心
  const screenWidth = plus.screen.resolutionWidth
  const screenHeight = plus.screen.resolutionHeight
  // 弹窗容器宽度百分比
  const popupViewWidthPercent = 0.8

  //弹窗容器宽度
  const popupViewWidth = screenWidth * popupViewWidthPercent
  // 弹窗容器的Padding
  const viewContentPadding = 20

  // 弹窗容器的宽度
  const viewContentWidth = parseInt(popupViewWidth - viewContentPadding * 2)
  // 描述的列表
  const descriptionList = drawtext(changelog || '', viewContentWidth)
  const imgHeight = $iconUrl ? 20 : 0
  // 弹窗容器高度
  let popupViewHeight = 80 + 20 + 90 + 10 + imgHeight
  // let popupViewHeight = 80 + 20 + 20 + 90 + 10
  let popupViewContentList = [
    {
      src: $iconUrl,
      id: 'logo',
      tag: 'img',
      position: {
        top: '0px',
        left: (popupViewWidth - 124) / 2 + 'px',
        width: '124px',
        height: '80px',
      },
    },
    {
      tag: 'font',
      id: 'title',
      text: `发现新版本${version}`,
      textStyles: {
        size: '18px',
        color: '#333',
        weight: 'bold',
        whiteSpace: 'normal',
      },
      position: {
        top: `${70 + imgHeight}px`,
        left: viewContentPadding + 'px',
        width: viewContentWidth + 'px',
        height: '30px',
      },
    },
  ]
  const textHeight = 18
  let contentTop = 110 + imgHeight

  descriptionList.forEach((item, index) => {
    if (index > 0) {
      popupViewHeight += textHeight
      contentTop += textHeight
    }
    popupViewContentList.push({
      tag: 'font',
      id: 'content' + index + 1,
      text: item.content,
      textStyles: {
        size: '14px',
        color: '#666',
        lineSpacing: '50%',
        align: 'left',
      },
      position: {
        top: contentTop + 'px',
        left: viewContentPadding + 'px',
        width: viewContentWidth + 'px',
        height: textHeight + 'px',
      },
    })
    if (item.type == 'break') {
      contentTop += 10
      popupViewHeight += 10
    }
  })
  // 弹窗内容
  let popupView = new plus.nativeObj.View('popupView', {
    //创建底部图标菜单
    tag: 'rect',
    top: (screenHeight - popupViewHeight) / 2 + 'px',
    left: `${((1 - popupViewWidthPercent) / 2) * 100}%`,
    height: popupViewHeight + 'px',
    width: `${popupViewWidthPercent * 100}%`,
  })
  // 绘制白色背景
  popupView.drawRect(
    {
      color: '#FFFFFF',
      radius: '8px',
    },
    {
      top: '40px',
      height: popupViewHeight - 40 + 'px',
    },
  )
  // 绘制底边按钮
  popupView.drawRect(
    {
      radius: '3px',
      borderColor: '#f1f1f1',
      borderWidth: '1px',
    },
    {
      bottom: viewContentPadding + 'px',
      left: viewContentPadding + 'px',
      width: (viewContentWidth - viewContentPadding) / 2 + 'px',
      height: '30px',
    },
  )
  // 绘制底边按钮
  popupView.drawRect(
    {
      radius: '3px',
      color: $mainColor,
    },
    {
      bottom: viewContentPadding + 'px',
      left:
        (viewContentWidth - viewContentPadding) / 2 +
        viewContentPadding * 2 +
        'px',
      width: (viewContentWidth - viewContentPadding) / 2 + 'px',
      height: '30px',
    },
  )
  popupViewContentList.push({
    tag: 'font',
    id: 'cancelText',
    text: '暂不升级',
    textStyles: {
      size: '14px',
      color: '#666',
      lineSpacing: '0%',
      whiteSpace: 'normal',
    },
    position: {
      bottom: viewContentPadding + 'px',
      left: viewContentPadding + 'px',
      width: (viewContentWidth - viewContentPadding) / 2 + 'px',
      height: '30px',
    },
  })
  popupViewContentList.push({
    tag: 'font',
    id: 'confirmText',
    text: '立即升级',
    textStyles: {
      size: '14px',
      color: '#FFF',
      lineSpacing: '0%',
      whiteSpace: 'normal',
    },
    position: {
      bottom: viewContentPadding + 'px',
      left:
        (viewContentWidth - viewContentPadding) / 2 +
        viewContentPadding * 2 +
        'px',
      width: (viewContentWidth - viewContentPadding) / 2 + 'px',
      height: '30px',
    },
  })
  popupView.draw(popupViewContentList)
  popupView.addEventListener('click', function (e) {
    let maxTop = popupViewHeight - viewContentPadding
    let maxLeft = popupViewWidth - viewContentPadding
    let buttonWidth = (viewContentWidth - viewContentPadding) / 2
    if (e.clientY > maxTop - 30 && e.clientY < maxTop) {
      // 暂不升级
      if (
        e.clientX > viewContentPadding &&
        e.clientX < maxLeft - buttonWidth - viewContentPadding
      ) {
        maskLayer.hide()
        popupView.hide()
      } else if (e.clientX > maxLeft - buttonWidth && e.clientX < maxLeft) {
        // 立即升级
        maskLayer.hide()
        popupView.hide()
        callback && callback()
      }
    }
  })
  // 点击遮罩层
  // maskLayer.addEventListener('click', function() {
  //   //处理遮罩层点击
  //   maskLayer.hide()
  //   popupView.hide()
  // })
  // 显示弹窗
  maskLayer.show()
  popupView.show()
}
// 文件下载的弹窗绘图
function downloadPopupDrawing(data) {
  // 以下为计算菜单的nview绘制布局，为固定算法，使用者无关关心
  const screenWidth = plus.screen.resolutionWidth
  const screenHeight = plus.screen.resolutionHeight
  //弹窗容器宽度
  const popupViewWidth = screenWidth * 0.7
  // 弹窗容器的Padding
  const viewContentPadding = 20
  // 弹窗容器的宽度
  const viewContentWidth = popupViewWidth - viewContentPadding * 2
  // 弹窗容器高度
  let popupViewHeight = viewContentPadding * 3 + 60
  let progressTip = data.progressTip || '准备下载...'
  let contentText = data.contentText || '正在为您更新，请耐心等待'
  let elementList = [
    {
      tag: 'rect', //背景色
      color: '#FFFFFF',
      rectStyles: {
        radius: '8px',
      },
    },
    {
      tag: 'font',
      id: 'title',
      text: '升级APP',
      textStyles: {
        size: '16px',
        color: '#333',
        weight: 'bold',
        verticalAlign: 'middle',
        whiteSpace: 'normal',
      },
      position: {
        top: viewContentPadding + 'px',
        height: '30px',
      },
    },
    {
      tag: 'font',
      id: 'content',
      text: contentText,
      textStyles: {
        size: '14px',
        color: '#333',
        verticalAlign: 'middle',
        whiteSpace: 'normal',
      },
      position: {
        top: viewContentPadding * 2 + 30 + 'px',
        height: '20px',
      },
    },
  ]
  // 是否有进度条
  if (data.progress) {
    popupViewHeight += viewContentPadding + 40
    elementList = elementList.concat([
      {
        tag: 'font',
        id: 'progressValue',
        text: progressTip,
        textStyles: {
          size: '14px',
          color: $mainColor,
          whiteSpace: 'normal',
        },
        position: {
          top: viewContentPadding * 4 + 20 + 'px',
          height: '30px',
        },
      },
      {
        tag: 'rect', //绘制进度条背景
        id: 'progressBg',
        rectStyles: {
          radius: '4px',
          borderColor: '#f1f1f1',
          borderWidth: '1px',
        },
        position: {
          top: viewContentPadding * 4 + 60 + 'px',
          left: viewContentPadding + 'px',
          width: viewContentWidth + 'px',
          height: '8px',
        },
      },
    ])
  }
  if (data.buttonNum == 2) {
    popupViewHeight += viewContentPadding + 30
    elementList = elementList.concat([
      {
        tag: 'rect', //绘制底边按钮
        rectStyles: {
          radius: '3px',
          borderColor: '#f1f1f1',
          borderWidth: '1px',
        },
        position: {
          bottom: viewContentPadding + 'px',
          left: viewContentPadding + 'px',
          width: (viewContentWidth - viewContentPadding) / 2 + 'px',
          height: '30px',
        },
      },
      {
        tag: 'rect', //绘制底边按钮
        rectStyles: {
          radius: '3px',
          color: $mainColor,
        },
        position: {
          bottom: viewContentPadding + 'px',
          left:
            (viewContentWidth - viewContentPadding) / 2 +
            viewContentPadding * 2 +
            'px',
          width: (viewContentWidth - viewContentPadding) / 2 + 'px',
          height: '30px',
        },
      },
      {
        tag: 'font',
        id: 'cancelText',
        text: '取消下载',
        textStyles: {
          size: '14px',
          color: '#666',
          lineSpacing: '0%',
          whiteSpace: 'normal',
        },
        position: {
          bottom: viewContentPadding + 'px',
          left: viewContentPadding + 'px',
          width: (viewContentWidth - viewContentPadding) / 2 + 'px',
          height: '30px',
        },
      },
      {
        tag: 'font',
        id: 'confirmText',
        text: '后台下载',
        textStyles: {
          size: '14px',
          color: '#FFF',
          lineSpacing: '0%',
          whiteSpace: 'normal',
        },
        position: {
          bottom: viewContentPadding + 'px',
          left:
            (viewContentWidth - viewContentPadding) / 2 +
            viewContentPadding * 2 +
            'px',
          width: (viewContentWidth - viewContentPadding) / 2 + 'px',
          height: '30px',
        },
      },
    ])
  }
  if (data.buttonNum == 1) {
    popupViewHeight += viewContentPadding + 40
    elementList = elementList.concat([
      {
        tag: 'rect', //绘制底边按钮
        rectStyles: {
          radius: '6px',
          color: $mainColor,
        },
        position: {
          bottom: viewContentPadding + 'px',
          left: viewContentPadding + 'px',
          width: viewContentWidth + 'px',
          height: '40px',
        },
      },
      {
        tag: 'font',
        id: 'confirmText',
        text: '关闭',
        textStyles: {
          size: '14px',
          color: '#FFF',
          lineSpacing: '0%',
        },
        position: {
          bottom: viewContentPadding + 'px',
          left: viewContentPadding + 'px',
          width: viewContentWidth + 'px',
          height: '40px',
        },
      },
    ])
  }
  return {
    popupViewHeight: popupViewHeight,
    popupViewWidth: popupViewWidth,
    screenHeight: screenHeight,
    viewContentWidth: viewContentWidth,
    viewContentPadding: viewContentPadding,
    elementList: elementList,
  }
}
// 文件下载的弹窗
function downloadPopup(data) {
  // 弹窗遮罩层
  let maskLayer = new plus.nativeObj.View('maskLayer', {
    //先创建遮罩层
    top: '0px',
    left: '0px',
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  })
  let popupViewData = downloadPopupDrawing(data)
  // 弹窗内容
  let popupView = new plus.nativeObj.View('popupView', {
    //创建底部图标菜单
    tag: 'rect',
    top:
      (popupViewData.screenHeight - popupViewData.popupViewHeight) / 2 + 'px',
    left: '15%',
    height: popupViewData.popupViewHeight + 'px',
    width: '70%',
  })
  let progressValue = 0
  let progressTip = 0
  let contentText = 0
  let buttonNum = 2
  if (data.buttonNum >= 0) {
    buttonNum = data.buttonNum
  }
  popupView.draw(popupViewData.elementList)
  let callbackData = {
    change: function (res) {
      let progressElement = []
      if (res.progressValue) {
        progressValue = res.progressValue
        // 绘制进度条
        progressElement.push({
          tag: 'rect', //绘制进度条背景
          id: 'progressValueBg',
          rectStyles: {
            radius: '4px',
            color: $mainColor,
          },
          position: {
            top: popupViewData.viewContentPadding * 4 + 60 + 'px',
            left: popupViewData.viewContentPadding + 'px',
            width:
              popupViewData.viewContentWidth * (res.progressValue / 100) + 'px',
            height: '8px',
          },
        })
      }
      if (res.progressTip) {
        progressTip = res.progressTip
        progressElement.push({
          tag: 'font',
          id: 'progressValue',
          text: res.progressTip,
          textStyles: {
            size: '14px',
            color: $mainColor,
            whiteSpace: 'normal',
          },
          position: {
            top: popupViewData.viewContentPadding * 4 + 20 + 'px',
            height: '30px',
          },
        })
      }
      if (res.contentText) {
        contentText = res.contentText
        progressElement.push({
          tag: 'font',
          id: 'content',
          text: res.contentText,
          textStyles: {
            size: '16px',
            color: '#333',
            whiteSpace: 'normal',
          },
          position: {
            top: popupViewData.viewContentPadding * 2 + 30 + 'px',
            height: '30px',
          },
        })
      }
      if (res.buttonNum >= 0 && buttonNum != res.buttonNum) {
        buttonNum = res.buttonNum
        popupView.reset()
        popupViewData = downloadPopupDrawing(
          Object.assign(
            {
              progressValue: progressValue,
              progressTip: progressTip,
              contentText: contentText,
            },
            res,
          ),
        )
        let newElement = []
        popupViewData.elementList.map((item, index) => {
          let have = false
          progressElement.forEach((childItem, childIndex) => {
            if (item.id == childItem.id) {
              have = true
            }
          })
          if (!have) {
            newElement.push(item)
          }
        })
        progressElement = newElement.concat(progressElement)
        popupView.setStyle({
          tag: 'rect',
          top:
            (popupViewData.screenHeight - popupViewData.popupViewHeight) / 2 +
            'px',
          left: '15%',
          height: popupViewData.popupViewHeight + 'px',
          width: '70%',
        })
        popupView.draw(progressElement)
      } else {
        popupView.draw(progressElement)
      }
    },
    cancel: function () {
      maskLayer.hide()
      popupView.hide()
    },
  }
  popupView.addEventListener('click', function (e) {
    let maxTop =
      popupViewData.popupViewHeight - popupViewData.viewContentPadding
    let maxLeft =
      popupViewData.popupViewWidth - popupViewData.viewContentPadding
    if (e.clientY > maxTop - 40 && e.clientY < maxTop) {
      if (buttonNum == 1) {
        // 单按钮
        if (
          e.clientX > popupViewData.viewContentPadding &&
          e.clientX < maxLeft
        ) {
          maskLayer.hide()
          popupView.hide()
          callbackData.reboot()
        }
      } else if (buttonNum == 2) {
        // 双按钮
        let buttonWidth =
          (popupViewData.viewContentWidth - popupViewData.viewContentPadding) /
          2
        if (
          e.clientX > popupViewData.viewContentPadding &&
          e.clientX < maxLeft - buttonWidth - popupViewData.viewContentPadding
        ) {
          maskLayer.hide()
          popupView.hide()
          callbackData.cancelDownload()
        } else if (e.clientX > maxLeft - buttonWidth && e.clientX < maxLeft) {
          maskLayer.hide()
          popupView.hide()
        }
      }
    }
  })
  // 显示弹窗
  maskLayer.show()
  popupView.show()
  // 改变进度条
  return callbackData
}

/**
 * @param { String } msg 需要显示的消息
 * @param { Object } options 配置,同uni-app官网
 */
function toast(msg, options) {
  uni.showToast(
    Object.assign(
      {
        icon: 'none',
        title: msg,
        duration: 2000,
      },
      options,
    ),
  )
}
