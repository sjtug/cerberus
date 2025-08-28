
export default {
  zh: {
    challenge: {
      title: () => "验证您是真人",
      calculating: () => "正在进行浏览器检查...",
      difficulty_speed: (d) => "难度：" + d.difficulty + "，速度：" + d.speed + "kH/s",
      taking_longer: () => "验证时间超出预期，请勿刷新页面",
      why_seeing: () => "为什么我会看到这个页面？",
      why_seeing_body: {
        part_1: (d) => "您看到这个页面是因为网站管理员启用了 " + d.cerberus + " 来防御异常流量攻击。这类攻击可能导致网站服务中断，影响所有用户的正常访问。",
        part_2: (d) => "如果您了解 " + d.techaro + " 开发的 " + d.anubis + "，那么 Cerberus 采用了类似的 PoW 验证技术。不同的是，Anubis 主要针对 AI 爬虫，而 Cerberus 则采用了更激进的策略来保护我们的开源基础设施。",
        part_3: (d) => "请注意，Cerberus 需要启用现代 JavaScript 功能，而 " + d.jshelter + " 等插件会禁用这些功能。请为本域名禁用 " + d.jshelter + " 或类似的插件。"
      }
    },
    success: {
      title: () => "验证成功",
      verification_complete: () => "验证已完成",
      took_time_iterations: (d) => "用时 " + d.time + "ms，完成 " + d.iterations + " 次迭代"
    },
    error: {
      error_occurred: () => "出错了",
      server_error: () => "服务器返回了未知错误",
      client_error: () => "验证过程中发生了意外错误",
      access_restricted: () => "访问受限",
      must_enable_wasm: () => "请启用 WebAssembly 以继续访问",
      apologize_please_enable_wasm: () => "您的浏览器关闭了 WebAssembly，这可能是由于设置或插件导致的。已知部分浏览器（如 Safari 的锁定模式）会默认禁用 WebAssembly。 您需要重新启用 JavaScript 才能继续访问，抱歉给您带来不便。",
      browser_config_or_bug: () => "这可能是浏览器配置问题造成的，或是我们的系统出现了异常。联系我们时烦请您附上错误详情。",
      error_details: (d) => "错误详情：" + d.error,
      ip_blocked: () => "由于检测到可疑活动，您的 IP 地址或本地网络已被封禁",
      wait_before_retry: () => "请稍后再试，某些情况下可能需要等待数小时",
      what_should_i_do: () => "我该怎么办？",
      must_enable_js: () => "请启用 JavaScript 以继续访问",
      apologize_please_enable_js: () => "您的浏览器关闭了 JavaScript，这可能是由于设置或插件导致的。您需要重新启用 JavaScript 才能继续访问，抱歉给您带来不便。",
      do_not_reload_too_often: () => "您可以尝试解决问题（如果您知道如何解决）后重新加载页面，或者等待几秒钟后再刷新。但是请避免频繁刷新，因为这可能会导致您的 IP 地址被封禁。",
      contact_us: (d) => "如您有任何疑问，请发邮件到 " + d.mail + " 联系我们。随信请附下方显示的 Request ID，以便我们进行排查。"
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
      }
    },
    success: {
      title: () => "Success!",
      verification_complete: () => "Verification Complete!",
      took_time_iterations: (d) => "Took " + d.time + "ms, " + d.iterations + " iterations"
    },
    error: {
      error_occurred: () => "Oops! Something went wrong",
      server_error: () => "Server returned an error that we cannot handle.",
      client_error: () => "Unexpected error occurred during verification.",
      access_restricted: () => "Access has been restricted.",
      must_enable_wasm: () => "Please enable WebAssembly to proceed.",
      apologize_please_enable_wasm: () => "Your browser has WebAssembly disabled via settings or an extension. It's known that some browsers (e.g. Safari with Lockdown Mode) disable WebAssembly by default. We apologize for the inconvenience, but please re-enable WebAssembly to proceed.",
      browser_config_or_bug: () => "There might be an issue with your browser configuration, or something is wrong on our side. Please attach the error details when contacting us.",
      error_details: (d) => "Error details: " + d.error,
      ip_blocked: () => "You (or your local network) have been blocked due to suspicious activity.",
      wait_before_retry: () => "Please wait a while before you try again; in some cases this may take a few hours.",
      must_enable_js: () => "You must enable JavaScript to proceed.",
      what_should_i_do: () => "What should I do?",
      apologize_please_enable_js: () => "Your browser has JavaScript disabled via settings or an extension. We apologize for the inconvenience, but please re-enable JavaScript to proceed.",
      do_not_reload_too_often: () => "You can try fixing the underlying issue (if you know how) and then reload the page, or simply wait a few seconds before refreshing. However, avoid reloading too frequently as this may cause your IP address to be blocked.",
      contact_us: (d) => "If you believe this is an error or have any questions, please contact us at " + d.mail + ". Please kindly attach the request ID shown below to help us investigate."
    },
    footer: {
      author: (d) => "Protected by " + d.cerberus + " from " + d.sjtug + ".",
      upstream: (d) => "Heavily inspired by " + d.anubis + " from " + d.techaro + " in 🇨🇦."
    }
  }
}