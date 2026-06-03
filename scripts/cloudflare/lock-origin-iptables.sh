#!/bin/bash
# Origin server (133.130.102.77) を Cloudflare CIDR 以外から 443 で叩けないように
# iptables で絞る。443 は CF レンジのみ、3000(Next.js direct) は完全 DROP。
# SSH(22) はそのまま、policy は ACCEPT を維持してロックアウト事故を避ける。
#
# 実行: ssh で本番に入って bash で叩く。リモート実行用に SSH 経由のラッパーは別途。

set -eu
# pipefail はあえて使わない: grep が空ヒット(=既存 KABU_AI ルール無し)
# でもパイプ全体が落ちないようにするため。

CF_V4_CIDRS=(
  173.245.48.0/20
  103.21.244.0/22
  103.22.200.0/22
  103.31.4.0/22
  141.101.64.0/18
  108.162.192.0/18
  190.93.240.0/20
  188.114.96.0/20
  197.234.240.0/22
  198.41.128.0/17
  162.158.0.0/15
  104.16.0.0/13
  104.24.0.0/14
  172.64.0.0/13
  131.0.72.0/22
)

CF_V6_CIDRS=(
  2400:cb00::/32
  2606:4700::/32
  2803:f800::/32
  2405:b500::/32
  2405:8100::/32
  2a06:98c0::/29
  2c0f:f248::/32
)

# 既存の "allow CF" / "block external 443/3000" ルールを一旦すべて削除して再構築。
# こうしないと再実行で重複ルールが積み上がる。
echo '==> 既存 KABU_AI ルールをクリーニング'
clean_existing() {
  local cmd="$1"
  local rules
  rules=$($cmd -S INPUT 2>/dev/null | grep -E '^-A INPUT.*(KABU_AI_)' | sed 's/^-A /-D /' || true)
  [ -z "$rules" ] && return 0
  while IFS= read -r rule; do
    [ -z "$rule" ] && continue
    eval "$cmd $rule" 2>/dev/null || true
  done <<< "$rules"
}
clean_existing iptables
clean_existing ip6tables

echo '==> ループバックと既存接続を許可(冪等)'
# loopback (lo) は CF 関係なく許可
iptables -C INPUT -i lo -j ACCEPT 2>/dev/null \
  || iptables -I INPUT 1 -i lo -j ACCEPT
ip6tables -C INPUT -i lo -j ACCEPT 2>/dev/null \
  || ip6tables -I INPUT 1 -i lo -j ACCEPT
# 既存接続(SSH 等が落ちないよう)
iptables -C INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null \
  || iptables -I INPUT 2 -m state --state RELATED,ESTABLISHED -j ACCEPT
ip6tables -C INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null \
  || ip6tables -I INPUT 2 -m state --state RELATED,ESTABLISHED -j ACCEPT

echo '==> 443/tcp を Cloudflare CIDR からのみ許可'
for cidr in "${CF_V4_CIDRS[@]}"; do
  iptables -A INPUT -p tcp --dport 443 -s "$cidr" \
    -m comment --comment "KABU_AI_CF_V4_443" -j ACCEPT
done
for cidr in "${CF_V6_CIDRS[@]}"; do
  ip6tables -A INPUT -p tcp --dport 443 -s "$cidr" \
    -m comment --comment "KABU_AI_CF_V6_443" -j ACCEPT
done

echo '==> 443/tcp その他ソースは DROP'
iptables -A INPUT -p tcp --dport 443 \
  -m comment --comment "KABU_AI_DROP_443" -j DROP
ip6tables -A INPUT -p tcp --dport 443 \
  -m comment --comment "KABU_AI_DROP_443" -j DROP

echo '==> 3000/tcp (Next.js standalone direct) は完全 DROP(loopback は上で許可済)'
iptables -A INPUT -p tcp --dport 3000 \
  -m comment --comment "KABU_AI_DROP_3000" -j DROP
ip6tables -A INPUT -p tcp --dport 3000 \
  -m comment --comment "KABU_AI_DROP_3000" -j DROP

echo '==> 永続化(iptables-persistent)'
if ! dpkg -l iptables-persistent 2>/dev/null | grep -q '^ii'; then
  echo '   iptables-persistent をインストール'
  DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi
iptables-save > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6

echo
echo '==> 適用後 INPUT チェイン (KABU_AI_* のみ抜粋)'
iptables -L INPUT -n -v --line-numbers | grep -E "KABU_AI_|policy" | head -30

echo
echo '==> 検証: 自分自身から CF 経由 (kabu-ai.jp) の 200 を確認'
curl -s -o /dev/null -w 'CF 経由: HTTP %{http_code}\n' https://kabu-ai.jp/
echo '   外部の origin 直叩きは弊スクリプトでは確認不可(別ホストから)。'
echo '   完了。SSH 切れていなければ成功。'
