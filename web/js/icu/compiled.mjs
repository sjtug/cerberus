
export default {
  zh: {
    challenge: {
      title: () => "验证您不是机器人",
      calculating: () => "正在进行浏览器检查...",
      difficulty_speed: (d) => "难度：" + d.difficulty + "，速度：" + d.speed + "kH/s",
      taking_longer: () => "验证时间超出预期，请勿刷新页面",
      why_seeing: () => "为什么我会看到这个页面？",
      why_seeing_body: {
        part_1: (d) => "您看到这个页面是因为网站管理员启用了 " + d.cerberus + " 来防御异常流量攻击。这类攻击可能导致网站服务中断，影响所有用户的正常访问。",
        part_2: (d) => "如果您了解 " + d.techaro + " 开发的 " + d.anubis + "，那么 Cerberus 采用了类似的 PoW 验证技术。不同的是，Anubis 主要针对 AI 爬虫，而 Cerberus 则采用了更激进的策略来保护我们的开源基础设施。",
        part_3: (d) => "请注意，Cerberus 需要启用现代 JavaScript 功能，而 " + d.jshelter + " 等插件会禁用这些功能。请为本域名禁用 " + d.jshelter + " 或类似的插件。"
      },
      must_enable_js: () => "请启用 JavaScript 以继续访问"
    },
    success: {
      title: () => "验证成功",
      verification_complete: () => "验证已完成",
      took_time_iterations: (d) => "用时 " + d.time + "ms，完成 " + d.iterations + " 次迭代"
    },
    error: {
      error_occurred: () => "发生错误",
      access_restricted: () => "访问受限",
      browser_config_or_bug: () => "可能是浏览器配置问题，也可能是我们的系统出现了异常",
      ip_blocked: () => "由于检测到可疑活动，您的 IP 地址或本地网络已被封禁",
      wait_before_retry: () => "请稍后再试，某些情况下可能需要等待数小时",
      contact_us: (d) => "如有问题，请通过 " + d.mail + " 联系我们。请附上下方显示的 request ID，以便我们进行排查。"
    },
    footer: {
      author: (d) => "由 " + d.sjtug + " 开发的 " + d.cerberus + " 提供保护",
      upstream: (d) => "灵感来源于 🇨🇦 " + d.techaro + " 开发的 " + d.anubis
    }
  },
  en: {
    challenge: {
      title: () => "Making sure you're not a bot!",
      calculating: () => "Performing browser checks...",
      difficulty_speed: (d) => "Difficulty: " + d.difficulty + ", Speed: " + d.speed + "kH/s",
      taking_longer: () => "This is taking longer than expected. Please do not refresh the page.",
      why_seeing: () => "Why am I seeing this?",
      why_seeing_body: {
        part_1: (d) => "You are seeing this because the administrator of this website has set up " + d.cerberus + " to protect the server against abusive traffic. This can and does cause downtime for the websites, which makes their resources inaccessible for everyone.",
        part_2: (d) => "If you're familiar with " + d.anubis + " by " + d.techaro + ", Cerberus is similar - it performs a PoW challenge to verify the request. While Anubis focuses on protecting websites from AI scrapers, Cerberus takes a much more aggressive approach to protect our open-source infrastructure.",
        part_3: (d) => "Please note that Cerberus requires the use of modern JavaScript features that plugins like " + d.jshelter + " will disable. Please disable " + d.jshelter + " or other such plugins for this domain."
      },
      must_enable_js: () => "You must enable JavaScript to proceed."
    },
    success: {
      title: () => "Success!",
      verification_complete: () => "Verification Complete!",
      took_time_iterations: (d) => "Took " + d.time + "ms, " + d.iterations + " iterations"
    },
    error: {
      error_occurred: () => "Error occurred while processing your request",
      access_restricted: () => "Access has been restricted",
      browser_config_or_bug: () => "There might be an issue with your browser configuration, or something is wrong on our side.",
      ip_blocked: () => "You (or your local network) have been blocked due to suspicious activity.",
      wait_before_retry: () => "Please wait a while before you try again; in some cases this may take a few hours.",
      contact_us: (d) => "If you believe this is an error, please contact us at " + d.mail + ". Attach the request ID shown below to help us investigate."
    },
    footer: {
      author: (d) => "Protected by " + d.cerberus + " from " + d.sjtug + ".",
      upstream: (d) => "Heavily inspired by " + d.anubis + " from " + d.techaro + " in 🇨🇦."
    }
  }
}