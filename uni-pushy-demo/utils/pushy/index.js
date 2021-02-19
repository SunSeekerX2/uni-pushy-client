/**
 * @name:
 * @author: SunSeekerX
 * @Date: 2021-02-18 18:09:08
 * @LastEditors: SunSeekerX
 * @LastEditTime: 2021-02-19 17:15:15
 */

// import Pushy from '@limm/uni-pushy-client'
import Pushy from './pushy'

const pushy = new Pushy({
  // 项目id
  projectId: '2ba8a18a2add3c5d29a170aed0278ab7',
  // 更新地址
  updateUrl: 'https://api.uni-pushy.yoouu.cn',
  // 主题色
  mainColor: '722ed1',
  // logo
  logo: '/static/images/update/ic_ar.png',
  // 是否打开检查更新
  update: true,
  // 是否强制安装更新包
  forceUpdate: true,
  // log
  log: true,
  // log 是否转换成 string, 解决某些使用情况下无法打印对象形式的 log
  logString: false,
})

const customPushy = new Pushy({
  // 项目id
  projectId: '2ba8a18a2add3c5d29a170aed0278ab7',
  // 更新地址
  updateUrl: 'https://api.uni-pushy.yoouu.cn',
  // 主题色
  mainColor: '722ed1',
  // logo
  logo: '/static/images/update/ic_ar.png',
  // 是否打开检查更新
  update: true,
  // 是否强制安装更新包
  forceUpdate: true,
  // log
  log: true,
  // log 是否转换成 string, 解决某些使用情况下无法打印对象形式的 log
  logString: false,
  // 是否使用自定义界面
  custom: true,
})

export { pushy, customPushy }
