# 公域订单转私域 Demo

这个版本已经从纯静态演示页升级成最小可用版本：

- 用户可以提交手机号和公域订单号
- 提交请求会经过 Vercel Serverless Function
- 数据会写入 Supabase 数据库
- 页面只展示当前设备最近提交的脱敏记录，不公开完整手机号

## 本地测试

```bash
node --test
```

## 上线架构

- 前端：静态 HTML/CSS/JS
- 服务端：Vercel `api/order-applications.mjs`
- 数据库：Supabase Postgres

## 第一步：创建 Supabase 项目

1. 打开 [Supabase](https://supabase.com/)
2. 创建一个新项目
3. 进入项目后，打开 `SQL Editor`
4. 把 [supabase/schema.sql](/Users/abm/Documents/New project 4/supabase/schema.sql:1) 的内容全部复制进去执行

执行完以后，会创建 `order_applications` 表，并且默认阻止前端直接读写这张表。

## 第二步：准备 Supabase 环境变量

在 Supabase 项目里找到：

- `Project URL`
- `service_role` key

注意：

- `service_role` 只能放在服务端
- 不要写进前端代码
- 不要上传到公开仓库的说明截图里

## 第三步：把项目切到 Vercel

因为 GitHub Pages 不能跑后端接口，这个版本要部署到 Vercel。

1. 打开 [Vercel](https://vercel.com/)
2. 用 GitHub 登录
3. 选择导入仓库 `leekingbom-ui/demo`
4. Framework Preset 选 `Other`
5. 不需要额外 build command
6. 不需要额外 output directory
7. 进入环境变量设置，新增：

```text
SUPABASE_URL=你的 Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
```

8. 点 `Deploy`

## 第四步：验证上线

部署完成后：

1. 打开 Vercel 给你的网址
2. 输入一个真实格式的手机号，例如 `13800138000`
3. 输入一个订单号，例如 `dy1284999292949124`
4. 点击“提交申请”

成功后应该看到：

- 页面提示“提交成功”
- 自动跳到订单明细页
- 明细中只显示脱敏手机号，例如 `138****8000`

## 后续建议

如果你要把它继续做成正式业务系统，下一步建议做：

1. 增加运营后台登录
2. 增加订单审核状态流转
3. 增加重复提交校验
4. 增加短信验证码或身份校验
5. 增加操作日志和风控限制
