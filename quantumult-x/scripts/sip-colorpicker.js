var content = JSON.parse($response.body);

/*
{
    "status" : 200,
    "success" : true,
    "trial" : {
        "remaining" : 15,
        "id" : "93664C78-5F8F-2D56-9F5D-2DA71D45086E",
        "days" : 15,
        "name" : "mbp18lincs",
        "date" : "2026-05-28"
    }
}
*/

const now = new Date();

// 年份：直接用 getFullYear()
const year = now.getFullYear();

// 月份：返回 0-11，需要 +1，同时补零
const month = String(now.getMonth() + 1).padStart(2, '0');

// 日期：补零
const day = String(now.getDate()).padStart(2, '0');

// 拼接成 YYYY-MM-DD 格式
const formattedDate = `${year}-${month}-${day}`;

content.trial.remaining = 15
content.trial.date = formattedDate

$done({body : JSON.stringify(content)});