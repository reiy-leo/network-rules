
function buildProxyGroups(proxies = [], proxy_target = "PROXY") {
  const countryRules = [
    { name: "香港", regex: /(香港|\bHK\b|\bHong\s?Kong\b|🇭🇰)/i, type: "select" },
    { name: "台湾", regex: /(台湾|\bTW\b|\bTaiwan\b)/i, type: "url-test" },
    { name: "日本", regex: /(日本|\bJP\b|\bJapan\b|🇯🇵)/i, type: "select" },
    { name: "新加坡", regex: /(新加坡|\bSG\b|\bSingapore\b|🇸🇬)/i, type: "select" },
    { name: "美国", regex: /(美国|\bUS\b|\bUnited\s?States\b|🇺🇸)/i, type: "url-test" },
    { name: "英国", regex: /(英国|\bGB\b|\bUK\b|\bUnited\s?Kingdoms\b|🇬🇧)/i, type: "url-test" }
  ];

  // 这些条目的proxy不展示
  const ignore_proxy = /^(剩余流量|距离下次重置|套餐到期)/i

  const categorized = {};
  countryRules.forEach(rule => {
    categorized[rule.name] = [];
  });
  const others = [];

  // 2. 遍历提取节点名并归类
  for (const proxy of proxies) {
    const name = proxy?.name;
    if (!name) continue;
    if (!!ignore_proxy.test(name)) continue;

    const matchedRule = countryRules.find(rule => rule.regex.test(name));
    if (matchedRule) {
      categorized[matchedRule.name].push(name);
    } else {
      others.push(name);
    }
  }

  // 3. 构建各个国家的子策略组
  const countryGroups = [];
  countryRules.forEach(rule => {
    const nodeNames = categorized[rule.name];
    // 节点数大于 0 才建组，防止空组导致客户端报错
    if (nodeNames.length > 0) {
      countryGroups.push({
        name: rule.name,
        type: rule.type,
        url: "http://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 50,
        proxies: nodeNames
      });
    }
  });

  if (others.length > 0) {
    countryGroups.push({
      name: "其他",
      type: "select",
      proxies: others
    });
  }

  const validCountryGroupNames = countryGroups.map(g => g.name);
  const allProxyNames = proxies.map(p => p.name).filter(Boolean);

  // 4. 组装上层总控组（节点选择、自动选择、故障转移等）
  const mainGroups = [
    {
      name: "良心云",
      type: "select",
      // 优先展示国家组，其次是全局自动/直连，最后列出全量单节点供备选
      proxies: validCountryGroupNames
    },
    {
      name: "Auto",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: allProxyNames.length > 0 ? allProxyNames : ["DIRECT"]
    }
  ];

  return [...mainGroups, ...countryGroups];
}

function buildRuleProviders() {
  const providers = {
    adblock: {
      url: "https://cdn.jsdelivr.net/gh/REIJI007/AdBlock_Rule_For_Clash@main/adblock_reject.mrs",
      behavior: "classical",
      format: "mrs",
    },
    mtyy: {
      url: "https://raw.githubusercontent.com/reiy-leo/network-rules/refs/heads/main/quantumult-x/filters/mtyy.list",
      behavior: "classical",
      format: "text"
    }
  };
  let rule_providers = {};
  Object.keys(providers).forEach(function (name) {
    rule_providers[name] = {
      type: "http",
      behavior: providers[name].behavior,
      format: providers[name].format,
      url: providers[name].url,
      path: "./ruleset/" + name + ".list",
      interval: 86400,
      timeout: 60
    };
  });
  return rule_providers;
}

function buildRules(rules = [], proxy_target = 'PROXY') {
  const rules2 = [
    "GEOIP,LAN,DIRECT",
    "GEOIP,CN,DIRECT",

    "PROCESS-NAME,aria2c,DIRECT", // aria2c直连
    "PROCESS-NAME,aria2c.exe,DIRECT",
    "PROCESS-NAME,Motrix,DIRECT",
    "PROCESS-NAME,Motrix.exe,DIRECT",
    "PROCESS-NAME,Motrix Helper,DIRECT",
    "PROCESS-NAME,Motrix Helper (Renderer),DIRECT",
    "GEOSITE,category-pt,DIRECT",
    "GEOSITE,category-public-tracker,DIRECT",

    "GEOSITE,category-ads-all,REJECT", // 拒绝广告
    "RULE-SET,adblock,REJECT",

    "DOMAIN,api.bilibili.com,DIRECT", // 哔哩哔哩打不开

    "DOMAIN-SUFFIX,mon.zijieapi.com,REJECT", // 字节 今日头条 监控
    "DOMAIN,googletagmanager.com," + proxy_target,
    "DOMAIN,img.bwcgee.cn," + proxy_target
  ];
  const existed_rules = rules.map(r => String(r).trim().toUpperCase());
  const new_rules = rules2.filter(r => existed_rules.indexOf(r.toUpperCase()) === -1);
  if (new_rules.length) {
    return new_rules.concat(rules);
  }
  return rules;
}

function buildFakeipFilter(items = []) {
  const to_add = [
    "geosite:category-pt", // 确保p2p tracker不走fakeip
    "*.cmpassport.com",
    "*.cmbchina.com", // 工商银行
    "*.jegotrip.com.cn",
    "*.icitymobile.mobi",
    "id6.me",
    "*.pingan.com.cn",
    "challenges.cloudflare.com", // cloudflare验证需要真实IP
    "*.icloud.com.cn",
    "selfcdn.simaguo.com",
    "idm.api.io.mi.com",
    "*.orb.local", // orbstack的本地
    "*.local", "+.lan", "+.home",// 局域网不用代理
    "time.*.com", "ntp.*.com",// 校准时间不用代理
    "*.msftncsi.com",
    "+.stun.*.*", // STUN WebRTC需要真实IP
    "mitm.it" // mitmweb mitmproxy的证书安装
  ];
  const to_add2 = to_add.filter(r => items.indexOf(r) === -1);
  return items.concat(to_add2);
}

const main = (config) => {
  // 良心云默认的代理组是“良心云“
  const PROXY_TARGET = '良心云'

  config.rules = config.rules || [];
  config.dns = config.dns || {};
  config.tun = config.tun || {};

  if (!config["rule-providers"]) {
    config["rule-providers"] = {};
  }
  if (!config.dns["enable"]) {
    config.dns["enable"] = true;
  }
  if (!config.tun["enable"]) {
    config.tun["enable"] = true;
  }
  if (!config.dns["nameserver-policy"]) {
    config.dns["nameserver-policy"] = {};
  }
  // geosite中标记的广告地址，不DNS解析，直接返回200状态
  config.dns["nameserver-policy"]["geosite:category-ads-all"] = "rcode://success";
  config.dns["nameserver-policy"]["geosite:category-pt"] = [
    "223.5.5.5",
    "119.29.29.29"
  ];

  // 不经过fakeip，使用真实IP
  // 等同于Quantumult X中的dns_exclusion_list
  config.dns["fake-ip-filter"] = buildFakeipFilter(config.dns["fake-ip-filter"]);

  config.tun["route-exclude-address"] = [
    "192.168.0.0/16",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "169.254.0.0/16",
    "224.0.0.0/4", // mDNS组播，扫无线调试必须排除
    "fe80::/10",
    "fd00::/8",
  ];

  const providers = buildRuleProviders()
  config["rule-providers"] = Object.assign({}, config["rule-providers"], providers)

  config.rules = buildRules(config.rules, PROXY_TARGET)

  config["proxy-groups"] = buildProxyGroups(config.proxies, PROXY_TARGET);

  return config;
}