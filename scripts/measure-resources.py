#!/usr/bin/env python3
"""Снимки Docker stats без env, пользовательских данных и логов приложения."""
import argparse
import json
import math
import platform
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path


def command(args):
    return subprocess.check_output(args, text=True).strip()


def memory_mib(value):
    match = re.fullmatch(r"([\d.]+)\s*([A-Za-z]+)", value.strip())
    if not match:
        raise ValueError(f"Неизвестная единица памяти: {value}")
    factors = {"B": 1, "kB": 1000, "MB": 1000**2, "GB": 1000**3,
               "KiB": 1024, "MiB": 1024**2, "GiB": 1024**3}
    return float(match[1]) * factors[match[2]] / 1024**2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compose", default="docker-compose.deploy.yaml")
    parser.add_argument("--env-file", default=".env")
    parser.add_argument("--samples", type=int, default=60)
    parser.add_argument("--interval", type=float, default=5)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.samples < 2 or args.interval <= 0:
        parser.error("Нужны минимум 2 снимка и положительный интервал")
    root = Path(__file__).resolve().parent.parent
    compose = ["docker", "compose", "--env-file", str(root / args.env_file),
               "-f", str(root / args.compose)]
    services = ("postgres", "backend", "nginx")
    ids = {}
    for service in services:
        container = command(compose + ["ps", "--status", "running", "-q", service])
        if not container or "\n" in container:
            raise RuntimeError(f"Ожидался один работающий контейнер {service}")
        ids[service] = container
    out = args.output or root / "logs/resources" / datetime.now().strftime("%Y%m%d-%H%M%S")
    out.mkdir(parents=True, exist_ok=False)
    metadata = {
        "commit": command(["git", "-C", str(root), "rev-parse", "HEAD"]),
        "working_tree_dirty": bool(command(["git", "-C", str(root), "status", "--porcelain"])),
        "docker_arch_cpus_memory_bytes_version": command([
            "docker", "info", "--format", "{{.Architecture}} {{.NCPU}} {{.MemTotal}} {{.ServerVersion}}"]),
        "client_platform": platform.platform(),
        "compose": args.compose, "samples": args.samples, "interval_seconds": args.interval,
    }
    (out / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    def states():
        return {service: command(["docker", "inspect", "--format",
                                 "{{.RestartCount}} {{.State.OOMKilled}} {{.State.Status}}", container])
                for service, container in ids.items()}

    initial_states = states()
    records = []
    with (out / "samples.jsonl").open("w") as raw:
        for index in range(args.samples):
            started = time.monotonic()
            now = datetime.now(timezone.utc).isoformat()
            snapshot = command(["docker", "stats", "--no-stream", "--format", "{{json .}}", *ids.values()])
            rows = [json.loads(line) for line in snapshot.splitlines()]
            sample = {}
            for service, container in ids.items():
                row = next((row for row in rows if container.startswith(row["ID"])), None)
                if row is None:
                    raise RuntimeError(f"Контейнер {service} исчез; замер неполный: {out}")
                used, limit = row["MemUsage"].split("/")
                sample[service] = {"cpu_percent": float(row["CPUPerc"].rstrip("%")),
                                   "memory_mib": memory_mib(used), "limit_mib": memory_mib(limit),
                                   "docker_stats": row}
            record = {"timestamp_utc": now, "services": sample}
            raw.write(json.dumps(record, ensure_ascii=False) + "\n")
            raw.flush()
            records.append(record)
            print(f"Снимок {index + 1}/{args.samples}", flush=True)
            if index + 1 < args.samples:
                time.sleep(max(0, args.interval - (time.monotonic() - started)))
    final_states = states()
    (out / "container-states.json").write_text(json.dumps(
        {"before": initial_states, "after": final_states}, indent=2) + "\n")
    if final_states != initial_states or any(not state.endswith("false running") for state in final_states.values()):
        raise RuntimeError(f"Контейнер остановился, перезапустился или OOM; проверьте {out}")
    lines = ["# Замер ресурсов Sabacc", "", f"Период: {records[0]['timestamp_utc']} — {records[-1]['timestamp_utc']}.",
             "", "| Сервис | CPU среднее, % | CPU пик, % | RAM p95, MiB | RAM пик, MiB |",
             "| --- | ---: | ---: | ---: | ---: |"]
    for service in services:
        cpu = [r["services"][service]["cpu_percent"] for r in records]
        ram = sorted(r["services"][service]["memory_mib"] for r in records)
        lines.append(f"| {service} | {sum(cpu)/len(cpu):.2f} | {max(cpu):.2f} | {ram[math.ceil(len(ram)*.95)-1]:.2f} | {max(ram):.2f} |")
    peak = max(sum(s["memory_mib"] for s in r["services"].values()) for r in records)
    lines += ["", f"Пик суммы памяти контейнеров в одном снимке: {peak:.2f} MiB.", "",
              "CPU 100% = одно логическое ядро. RAM — показатель Docker stats, не размер heap JVM.",
              "Это выборочные снимки; между ними возможны более высокие пики. ОС и сборка не включены.",
              "На Docker Desktop это Linux VM; результаты не равны замерам на сервере.",
              "", "Допишите сценарий, число игроков/партий и ошибки перед передачей девопсу.",
              "Исходные снимки: samples.jsonl; окружение: metadata.json."]
    (out / "summary.md").write_text("\n".join(lines) + "\n")
    print(f"Отчёт: {out / 'summary.md'}")


if __name__ == "__main__":
    try:
        main()
    except (subprocess.CalledProcessError, OSError, ValueError, RuntimeError) as error:
        raise SystemExit(f"Замер не завершён: {error}")
