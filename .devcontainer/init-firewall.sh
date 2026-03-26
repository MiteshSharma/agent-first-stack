#!/bin/bash
# Runs as root inside devcontainer

# Flush existing rules
iptables -F OUTPUT
iptables -F FORWARD

# Allow loopback and established connections
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (required for name resolution)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Allowlisted domains — resolve and allow by IP
ALLOWED_DOMAINS=(
  "registry.npmjs.org"
  "github.com"
  "api.anthropic.com"
  "cdn.jsdelivr.net"
)

for domain in "${ALLOWED_DOMAINS[@]}"; do
  for ip in $(dig +short "$domain" A); do
    iptables -A OUTPUT -d "$ip" -j ACCEPT
  done
done

# Allow internal Docker network (db + redis containers)
iptables -A OUTPUT -d 172.16.0.0/12 -j ACCEPT

# Block everything else
iptables -A OUTPUT -j DROP
echo "Firewall active. Allowed: ${ALLOWED_DOMAINS[*]}"
