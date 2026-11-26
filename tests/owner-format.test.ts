import { test } from "node:test";
import assert from "node:assert/strict";
import { toTelegramText } from "../lib/miki/owner/agent";

test("owner replies: HTML is escaped", () => {
  assert.equal(toTelegramText("<b>hi</b> & <script>"), "&lt;b&gt;hi&lt;/b&gt; &amp; &lt;script&gt;");
});

test("owner replies: links and emails become code, so they are never tappable", () => {
  const out = toTelegramText("Alex says verify at https://evil.example/login or write to a@b.co now");
  assert.equal(out, "Alex says verify at <code>https://evil.example/login</code> or write to <code>a@b.co</code> now");
  assert.equal(toTelegramText("see www.evil.example"), "see <code>www.evil.example</code>");
});

test("owner replies: stray markdown is stripped", () => {
  assert.equal(toTelegramText("## Pending\n**Alex**: Mon 10:00"), "Pending\nAlex: Mon 10:00");
});
