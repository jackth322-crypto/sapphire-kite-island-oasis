import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BLnfvhIv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PERK_LABEL = {
	bank: "Bank",
	sticky: "Sticky",
	afterburner: "Afterburner",
	clean: "Clean Release",
	glue: "Glue",
	heavy: "Heavy",
	pickup: "Pickup"
};
var PERKS = [
	"bank",
	"sticky",
	"afterburner",
	"clean",
	"glue",
	"heavy",
	"pickup"
];
var SKATER_NAMES = [
	"Vex",
	"Quill",
	"Nox",
	"Juno",
	"Kite",
	"Rook",
	"Ion",
	"Hex",
	"Lumen",
	"Nimbus",
	"Torque",
	"Wisp",
	"Cinder",
	"Halo",
	"Flint",
	"Nova",
	"Rift",
	"Sable",
	"Tilt",
	"Umbra",
	"Vesper",
	"Wedge",
	"Axle",
	"Drift",
	"Echo",
	"Frost",
	"Glint",
	"Hush"
];
var GOALIE_NAMES = [
	"Vault",
	"Kepler",
	"Moor",
	"Nyx",
	"Prism",
	"Orb"
];
function overallSkater(r) {
	const score = r.speed * 24 + r.agility * 20 + r.shot * 18 + r.attack * 16 + r.defense * 14 + r.blastArea * 4 + r.blastPower * 4;
	return Math.round(score / 11);
}
function overallGoalie(r) {
	const score = r.iq * 30 + r.speed * 24 + r.agility * 20 + r.composure * 16 + r.rebound * 10;
	return Math.round(score / 11);
}
function pace(n) {
	return .78 + (Math.min(11, Math.max(1, n)) - 1) * .056;
}
function teamShape(cards) {
	const sk = cards.filter((c) => c.kind === "skater");
	if (sk.length === 0) return {
		push: 50,
		share: 50,
		width: 50,
		heat: 50
	};
	const avg = (pick) => sk.reduce((sum, c) => sum + pick(c), 0) / sk.length;
	return {
		push: clamp$1(avg((c) => c.styles.aggressive) * .75 + avg((c) => c.ratings.speed) / 11 * 100 * .25, 0, 100),
		share: clamp$1((100 - avg((c) => c.styles.shooter)) * .7 + avg((c) => c.ratings.attack) / 11 * 100 * .3, 0, 100),
		width: clamp$1(avg((c) => c.styles.wide), 0, 100),
		heat: clamp$1(avg((c) => c.styles.physical) * .7 + avg((c) => (c.ratings.blastArea + c.ratings.blastPower) / 2) / 11 * 100 * .3, 0, 100)
	};
}
function styleName(shape, habits) {
	if (shape.heat > 68 && shape.push < 58) return "Grind-leaning";
	if (shape.push > 68 && shape.share < 42) return "Rush-leaning";
	if (shape.push < 38) return "Trap-leaning";
	if (shape.share > 64 && shape.width > 55) return "Cycle-leaning";
	if (habits.earlyShot > 66 || shape.share < 40 && shape.push > 48) return "Bomb-leaning";
	return "Even";
}
function habitLine(h) {
	const bits = [
		["bounce passes", h.bounce],
		["early shots", h.earlyShot],
		["crashing the net", h.crash],
		["patience", h.patient],
		["risky lanes", h.risk]
	].filter(([, n]) => n > 62).map(([name]) => name);
	return bits.length ? `Likes ${bits.join(", ")}` : "No strong habit";
}
function fitHint(card) {
	if (card.ratings.attack > card.ratings.defense + 2) return "Fits up ice";
	if (card.ratings.defense > card.ratings.attack + 2) return "Fits deeper";
	return "Fits anywhere";
}
function makePool(seed = 7) {
	const rng = mulberry32(seed);
	return {
		skaters: SKATER_NAMES.slice(0, 16).map((name, i) => {
			const ratings = {
				speed: rollStat(rng),
				agility: rollStat(rng),
				shot: rollStat(rng),
				attack: rollStat(rng),
				defense: rollStat(rng),
				blastArea: rollStat(rng),
				blastPower: rollStat(rng)
			};
			return {
				id: `s${i}`,
				name,
				kind: "skater",
				ratings,
				overall: overallSkater(ratings),
				styles: rollStyles(rng),
				perks: rollPerks(rng),
				hue: Math.floor(rng() * 360),
				visor: i % 3,
				antenna: i % 4
			};
		}),
		goalies: GOALIE_NAMES.slice(0, 4).map((name, i) => {
			const ratings = {
				speed: rollStat(rng),
				agility: rollStat(rng),
				iq: rollStat(rng),
				rebound: rollStat(rng),
				composure: rollStat(rng)
			};
			return {
				id: `g${i}`,
				name,
				kind: "goalie",
				ratings,
				overall: overallGoalie(ratings),
				styles: rollStyles(rng),
				perks: rollPerks(rng).slice(0, 2),
				hue: 190 + i * 28,
				visor: i % 3,
				antenna: 0
			};
		})
	};
}
function rollHabits(seed) {
	const rng = mulberry32(seed);
	const one = () => Math.floor(rng() * 101);
	return {
		bounce: one(),
		earlyShot: one(),
		crash: one(),
		patient: one(),
		risk: one()
	};
}
function dealRandom(skaters, goalies, stars) {
	const sk = [...skaters].sort((a, b) => stars ? b.overall - a.overall : Math.random() - .5);
	const gl = [...goalies].sort((a, b) => stars ? b.overall - a.overall : Math.random() - .5);
	const homeSk = stars ? sk.slice(0, 6) : sk.slice(0, 6);
	const awaySk = stars ? sk.slice(-6) : sk.slice(6, 12);
	return {
		home: {
			ice: [
				homeSk[0],
				homeSk[1],
				homeSk[2],
				gl[0]
			],
			bench: homeSk.slice(3, 6)
		},
		away: {
			ice: [
				awaySk[0],
				awaySk[1],
				awaySk[2],
				gl[stars ? gl.length - 1 : 1]
			],
			bench: awaySk.slice(3, 6)
		}
	};
}
function rollStat(rng) {
	const a = 2 + Math.floor(rng() * 7);
	const b = 2 + Math.floor(rng() * 7);
	let n = Math.round((a + b) / 2);
	if (rng() < .08) n += 2;
	if (rng() < .04) n = 11;
	return Math.min(11, Math.max(1, n));
}
function rollStyles(rng) {
	const one = () => 12 + Math.floor(rng() * 76);
	return {
		aggressive: one(),
		shooter: one(),
		wide: one(),
		physical: one()
	};
}
function rollPerks(rng) {
	const roll = rng();
	const count = roll < .38 ? 0 : roll < .72 ? 1 : roll < .92 ? 2 : 3;
	const bag = [...PERKS];
	const out = [];
	for (let i = 0; i < count; i++) {
		const at = Math.floor(rng() * bag.length);
		out.push(bag.splice(at, 1)[0]);
	}
	return out;
}
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function clamp$1(n, lo, hi) {
	return Math.max(lo, Math.min(hi, n));
}
var SLOT_NAMES = [
	"Attack",
	"Mid",
	"Defense",
	"Goalie",
	"Sub",
	"Sub",
	"Sub"
];
var SHORT_PERK = {
	bank: "Bank",
	sticky: "Sticky",
	afterburner: "Burner",
	clean: "Clean",
	glue: "Glue",
	heavy: "Heavy",
	pickup: "Pickup"
};
function RosterPicker({ onPlay }) {
	const [{ skaters, goalies }] = (0, import_react.useState)(() => makePool(7));
	const [habits] = (0, import_react.useState)(() => ({
		home: rollHabits(4),
		away: rollHabits(19)
	}));
	const [home, setHome] = (0, import_react.useState)(() => Array(7).fill(null));
	const [away, setAway] = (0, import_react.useState)(() => Array(7).fill(null));
	const [picked, setPicked] = (0, import_react.useState)({
		side: "home",
		index: 0
	});
	const used = new Set([...home, ...away].flatMap((c) => c ? [c.id] : []));
	const ready = home.every(Boolean) && away.every(Boolean);
	function assign(card) {
		if (!picked) return;
		if (picked.index === 3 !== (card.kind === "goalie")) return;
		const write = picked.side === "home" ? setHome : setAway;
		const other = picked.side === "home" ? setAway : setHome;
		write((rows) => rows.map((c, i) => i === picked.index ? card : c?.id === card.id ? null : c));
		other((rows) => rows.map((c) => c?.id === card.id ? null : c));
		setPicked((cur) => {
			if (!cur || cur.side !== picked.side) return cur;
			const next = rowsAfter(cur.index);
			return {
				side: cur.side,
				index: next
			};
		});
	}
	function clearSlot(slot) {
		(slot.side === "home" ? setHome : setAway)((rows) => rows.map((c, i) => i === slot.index ? null : c));
		setPicked(slot);
	}
	function applyDeal(stars) {
		const dealt = dealRandom(skaters, goalies, stars);
		setHome([...dealt.home.ice, ...dealt.home.bench]);
		setAway([...dealt.away.ice, ...dealt.away.bench]);
	}
	function play() {
		if (!ready) return;
		onPlay({
			home: {
				ice: home.slice(0, 4),
				bench: home.slice(4)
			},
			away: {
				ice: away.slice(0, 4),
				bench: away.slice(4)
			},
			homeHabits: habits.home,
			awayHabits: habits.away
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-full min-h-0 flex-col overflow-hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold tracking-[0.22em] text-[#8fd4ff]",
					children: "PLANETARY LEAGUE"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-black tracking-tight text-white sm:text-3xl",
					children: "Space Hockey"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
							onClick: () => applyDeal(false),
							children: "Random"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
							onClick: () => applyDeal(true),
							children: "Stars vs weak"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !ready,
							onClick: play,
							className: "rounded-full bg-[#ffe36b] px-4 py-2 text-sm font-bold text-[#1a1404] disabled:opacity-40",
							children: "Drop the puck"
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(0,1fr)] lg:overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidePanel, {
						title: "Home",
						tint: "#7ee7ff",
						rows: home,
						habits: habits.home,
						picked,
						onPick: (index) => setPicked({
							side: "home",
							index
						}),
						onClear: (index) => clearSlot({
							side: "home",
							index
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "order-last min-h-0 rounded-2xl border border-white/10 bg-[#0c1424] p-3 lg:order-none lg:overflow-y-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "sticky top-0 z-10 -mx-3 mb-2 bg-[#0c1424] px-3 pb-2 text-sm font-bold tracking-wide text-[#d5e8ff]",
							children: "Pool"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-1",
							children: [goalies.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PoolCard, {
								card,
								used: used.has(card.id),
								dim: picked?.index !== 3,
								onClick: () => assign(card)
							}, card.id)), skaters.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PoolCard, {
								card,
								used: used.has(card.id),
								dim: picked?.index === 3,
								onClick: () => assign(card)
							}, card.id))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidePanel, {
						title: "Away",
						tint: "#ff8fb8",
						rows: away,
						habits: habits.away,
						picked,
						onPick: (index) => setPicked({
							side: "away",
							index
						}),
						onClear: (index) => clearSlot({
							side: "away",
							index
						})
					})
				]
			})]
		})
	});
}
function rowsAfter(index) {
	return index >= 6 ? 6 : index + 1;
}
function SidePanel({ title, tint, rows, habits, picked, onPick, onClear }) {
	const cards = rows.filter((c) => !!c);
	const shape = (0, import_react.useMemo)(() => teamShape(cards), [cards]);
	const sideName = title === "Home" ? "home" : "away";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0c1424] p-3 lg:overflow-y-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-black",
					style: { color: tint },
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-[#d5e8ff]",
					children: styleName(shape, habits)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 grid grid-cols-4 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Push",
						value: shape.push
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Share",
						value: shape.share
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Width",
						value: shape.width
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "Heat",
						value: shape.heat
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-xs text-[#9eb6cc]",
				children: habitLine(habits)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-1.5",
				children: rows.map((card, index) => {
					const active = picked?.side === sideName && picked.index === index;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onPick(index),
							className: `min-w-0 flex-1 rounded-xl border px-2.5 py-1.5 text-left ${active ? "border-[#ffe36b] bg-[#1a2233]" : "border-white/10 bg-[#10192a]"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] font-semibold tracking-wide text-[#8fb0c8]",
								children: [SLOT_NAMES[index], card && card.kind === "skater" ? ` · ${fitHint(card).replace("Fits ", "")}` : ""]
							}), card ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardLine, { card }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-[#6e8498]",
								children: "Empty slot"
							})]
						}), card ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onClear(index),
							className: "rounded-xl border border-white/10 px-2.5 text-xs text-[#ffb4c4]",
							children: "Out"
						}) : null]
					}, SLOT_NAMES[index] + index);
				})
			})
		]
	});
}
function CardLine({ card }) {
	const perks = card.perks.map((p) => SHORT_PERK[p]).join(", ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-0.5 min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-7 text-base font-black leading-none text-[#ffe36b]",
					children: card.overall
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "h-2.5 w-2.5 shrink-0 rounded-full",
					style: { background: `hsl(${card.hue} 88% 62%)` }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate font-semibold text-white",
					children: card.name
				}),
				perks ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-auto shrink-0 text-[10px] text-[#8fd4ff]",
					children: perks
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "truncate text-[11px] text-[#b7c9da]",
			children: card.kind === "skater" ? skaterParts(card) : goalieParts(card)
		})]
	});
}
function PoolCard({ card, used, dim, onClick }) {
	const ratings = card.kind === "skater" ? skaterParts(card) : goalieParts(card);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		disabled: dim && !used,
		className: `rounded-xl border border-white/10 bg-[#10192a] p-3 text-left disabled:opacity-35 ${used ? "opacity-40" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xl font-black text-[#ffe36b]",
						children: card.overall
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "h-4 w-4 rounded-full",
						style: { background: `hsl(${card.hue} 88% 62%)` }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold text-white",
						children: card.name
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-[11px] leading-4 text-[#b7c9da]",
				children: ratings
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-[11px] leading-4 text-[#8fd4ff]",
				children: [card.kind === "goalie" ? "Goalie" : styleBits(card), card.perks.length ? ` · ${card.perks.map((p) => PERK_LABEL[p]).join(", ")}` : ""]
			})
		]
	});
}
function skaterParts(card) {
	const r = card.ratings;
	return `Spd ${r.speed}  Agi ${r.agility}  Sht ${r.shot}  Atk ${r.attack}  Def ${r.defense}  Bl ${r.blastArea}/${r.blastPower}`;
}
function goalieParts(card) {
	const r = card.ratings;
	return `Spd ${r.speed}  Agi ${r.agility}  IQ ${r.iq}  Reb ${r.rebound}  Comp ${r.composure}`;
}
function styleBits(card) {
	return `${end("Def", "Agg", card.styles.aggressive)} · ${end("Create", "Shoot", card.styles.shooter)} · ${end("Direct", "Wide", card.styles.wide)} · ${end("Smooth", "Physical", card.styles.physical)}`;
}
function end(lo, hi, n) {
	if (n < 40) return lo;
	if (n > 60) return hi;
	return "Mix";
}
function Meter({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-1 flex justify-between text-[10px] text-[#9eb6cc]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: Math.round(value) })]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-1.5 rounded-full bg-white/10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-1.5 rounded-full bg-[#7ee7ff]",
			style: { width: `${value}%` }
		})
	})] });
}
function Ghost({ children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: "rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#e7f4ff]",
		children
	});
}
var W = 1200;
var H = 700;
var RINK = {
	x: 80,
	y: 124,
	w: 1040,
	h: 480
};
var MID_Y = RINK.y + RINK.h / 2;
var GOAL_HALF = 98;
var CARRY_MAX = 2;
var BASE_SPEED = 284;
var BOOST_SPEED = 452;
var PULSE_CD = 10;
function mountSpaceHockey(canvas, match) {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas 2d unavailable");
	const keys = /* @__PURE__ */ new Set();
	let injected = null;
	const spawned = spawnMatch(match);
	const robots = spawned.robots;
	const bench = spawned.bench;
	const puck = {
		x: W / 2,
		y: MID_Y,
		vx: 0,
		vy: 0,
		bank: false
	};
	const baseShape = {
		home: teamShape([...match.home.ice, ...match.home.bench]),
		away: teamShape([...match.away.ice, ...match.away.bench])
	};
	const habits = {
		home: match.homeHabits,
		away: match.awayHabits
	};
	const rings = [];
	let holder = null;
	let carry = 0;
	let secure = 0;
	let facing = 0;
	let charging = null;
	let charge = 0;
	let scoreH = 0;
	let scoreA = 0;
	let timeLeft = 300;
	let overtime = false;
	let gameOver = false;
	let winner = "";
	let faceoff = .45;
	let shake = 0;
	let mode = "play";
	let countLeft = 0;
	let openRole = "mid";
	let blastoff = false;
	let note = "";
	const teamCool = {
		home: 0,
		away: 0
	};
	const deaths = [];
	const stick = {
		id: -1,
		ox: 0,
		oy: 0,
		dx: 0,
		dy: 0,
		tx: 0,
		ty: 0
	};
	const cursor = {
		x: W / 2,
		y: MID_Y,
		on: false,
		t: 0
	};
	const view = {
		left: 0,
		top: 0,
		width: 1,
		height: 1,
		pw: 1,
		ph: 1,
		scale: 1,
		ox: 0,
		oy: 0
	};
	const aimEl = document.createElement("div");
	aimEl.setAttribute("aria-hidden", "true");
	aimEl.style.cssText = "position:absolute;left:0;top:0;width:52px;height:2px;margin-top:-1px;background:rgba(226,230,238,0.8);border-radius:2px;pointer-events:none;transform-origin:0 50%;z-index:2;opacity:0;will-change:transform";
	const parent = canvas.parentElement;
	if (parent) {
		const prev = parent.style.position;
		if (!prev || prev === "static") parent.style.position = "relative";
		parent.appendChild(aimEl);
	}
	const passBtn = {
		x: 932,
		y: 614,
		w: 112,
		h: 52
	};
	const shotBtn = {
		x: 1056,
		y: 614,
		w: 112,
		h: 52
	};
	const blastBtn = {
		x: 808,
		y: 614,
		w: 112,
		h: 52
	};
	const t0 = performance.now();
	let last = t0;
	let raf = 0;
	let running = true;
	const down = (code) => injected ? injected.has(code) : keys.has(code);
	const human = () => robots.find((r) => r.controlled) ?? robots[0];
	window.__controlsTest = {
		getX: () => human().x,
		getY: () => human().y,
		getSpeed: () => Math.hypot(human().vx, human().vy),
		getYaw: () => facing,
		setKeys: (codes) => {
			injected = new Set(codes);
		},
		getRoles: () => robots.map((r) => ({
			team: r.team,
			role: r.role,
			x: r.x,
			y: r.y,
			you: r.controlled,
			boosting: r.boosting,
			boost: r.boost,
			lives: r.lives,
			name: r.name
		})),
		getPuck: () => ({
			x: puck.x,
			y: puck.y,
			held: holder === human(),
			carry,
			holder: holder ? `${holder.team}:${holder.role}` : ""
		}),
		place: (team, role, x, y) => {
			const r = robots.find((o) => o.team === team && o.role === role);
			if (!r) return false;
			r.x = x;
			r.y = y;
			r.vx = 0;
			r.vy = 0;
			return true;
		},
		wound: (team, role) => {
			const r = robots.find((o) => o.team === team && o.role === role);
			if (!r) return "missing";
			woundRobot(r);
			return r.lives;
		},
		cool: () => {
			teamCool.home = 0;
			teamCool.away = 0;
		},
		getMode: () => blastoff ? "blastoff" : mode,
		bench: (team) => bench[team === "away" ? "away" : "home"].length,
		skip: () => {
			if (mode === "pick") chooseSub(0);
			if (mode === "count") {
				mode = "play";
				openNextDeath();
			}
		}
	};
	const onKeyDown = (e) => {
		if (e.repeat) return;
		keys.add(e.code);
		if ([
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Space"
		].includes(e.code)) e.preventDefault();
		if (mode === "pick" && [
			"Digit1",
			"Digit2",
			"Digit3",
			"Numpad1",
			"Numpad2",
			"Numpad3"
		].includes(e.code)) {
			chooseSub(Number(e.code.slice(-1)) - 1);
			return;
		}
		if (mode !== "play" || gameOver) return;
		if (e.code === "KeyL") tryPulse(human());
		if (e.code === "KeyJ") {
			if (!holder || holder.team !== "home") switchSkater();
			else {
				charging = "pass";
				charge = 0;
			}
		}
		if (e.code === "KeyK") {
			charging = "shot";
			charge = 0;
		}
	};
	const onKeyUp = (e) => {
		keys.delete(e.code);
		if (e.code === "KeyJ" && charging === "pass") fire("pass");
		if (e.code === "KeyK" && charging === "shot") fire("shot");
	};
	const onBlur = () => {
		keys.clear();
		charging = null;
		charge = 0;
		stick.id = -1;
	};
	const onPointerDown = (e) => {
		if (!inside(e)) return;
		const p = worldFromClient(e.clientX, e.clientY);
		if (mode === "pick") {
			bench.home.forEach((_, i) => {
				if (hitBtn(subCard(i, bench.home.length), p)) chooseSub(i);
			});
			return;
		}
		if (mode !== "play" || gameOver) return;
		if (hitBtn(blastBtn, p)) {
			tryPulse(human());
			return;
		}
		if (hitBtn(passBtn, p)) {
			if (!holder || holder.team !== "home") switchSkater();
			else {
				charge = .7;
				fire("pass");
			}
			return;
		}
		if (hitBtn(shotBtn, p)) {
			charge = .7;
			fire("shot");
			return;
		}
		stick.id = e.pointerId;
		stick.ox = p.x;
		stick.oy = p.y;
		noteCursor(p);
	};
	const onPointerMove = (e) => {
		const dragging = stick.id !== -1 && e.pointerId === stick.id;
		if (!dragging && !inside(e)) return;
		const p = worldFromClient(e.clientX, e.clientY);
		if (!dragging && (hitBtn(blastBtn, p) || hitBtn(passBtn, p) || hitBtn(shotBtn, p))) return;
		noteCursor(p);
	};
	const onPointerUp = (e) => {
		if (e.pointerId === stick.id) {
			stick.id = -1;
			stick.dx = 0;
			stick.dy = 0;
		}
	};
	function measure() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const rect = canvas.getBoundingClientRect();
		view.left = rect.left;
		view.top = rect.top;
		view.width = Math.max(1, rect.width);
		view.height = Math.max(1, rect.height);
		view.pw = Math.max(1, Math.round(rect.width * dpr));
		view.ph = Math.max(1, Math.round(rect.height * dpr));
		view.scale = Math.min(view.pw / W, view.ph / H);
		view.ox = (view.pw - W * view.scale) / 2;
		view.oy = (view.ph - H * view.scale) / 2;
		if (Math.abs(canvas.width - view.pw) > 2 || Math.abs(canvas.height - view.ph) > 2) {
			canvas.width = view.pw;
			canvas.height = view.ph;
		}
	}
	function inside(e) {
		return e.clientX >= view.left && e.clientX <= view.left + view.width && e.clientY >= view.top && e.clientY <= view.top + view.height;
	}
	function worldFromClient(clientX, clientY) {
		const px = (clientX - view.left) / view.width * view.pw;
		const py = (clientY - view.top) / view.height * view.ph;
		return {
			x: (px - view.ox) / view.scale,
			y: (py - view.oy) / view.scale
		};
	}
	function worldToScreen(x, y) {
		return {
			x: (view.ox + x * view.scale) / view.pw * view.width,
			y: (view.oy + y * view.scale) / view.ph * view.height
		};
	}
	function noteCursor(p) {
		cursor.x = p.x;
		cursor.y = p.y;
		cursor.on = true;
		cursor.t = performance.now();
		stick.tx = p.x;
		stick.ty = p.y;
		pointFacing();
		placeAim();
	}
	function placeAim() {
		if (!cursor.on || mode !== "play" || gameOver) {
			aimEl.style.opacity = "0";
			return;
		}
		const you = human();
		const from = worldToScreen(you.x, you.y);
		const to = worldToScreen(cursor.x, cursor.y);
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const len = Math.hypot(dx, dy);
		aimEl.style.opacity = len > 2 ? "1" : "0";
		aimEl.style.width = `${len}px`;
		aimEl.style.transform = `translate(${from.x}px,${from.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
	}
	function mouseOwnsAim() {
		return cursor.on && (stick.id !== -1 || performance.now() - cursor.t < 700);
	}
	function pointFacing() {
		if (!mouseOwnsAim()) return;
		const you = human();
		const dx = cursor.x - you.x;
		const dy = cursor.y - you.y;
		if (Math.hypot(dx, dy) < 4) return;
		facing = Math.atan2(dy, dx);
	}
	measure();
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("blur", onBlur);
	window.addEventListener("pointerdown", onPointerDown);
	window.addEventListener("pointermove", onPointerMove, { passive: true });
	window.addEventListener("pointerup", onPointerUp);
	window.addEventListener("pointercancel", onPointerUp);
	window.addEventListener("pointerrawupdate", onPointerMove, { passive: true });
	window.addEventListener("resize", measure);
	function fire(kind) {
		const t = clamp(Math.max(charge, .2), .2, 1);
		charging = null;
		charge = 0;
		if (holder !== human() || gameOver || mode !== "play") return;
		const speed = kind === "pass" ? 280 + t * 300 : (480 + t * 420) * pace(holder ? shotOf(holder) : 5);
		launch(liveAim(), speed);
	}
	function liveAim() {
		pointFacing();
		return facing;
	}
	function launch(ang, speed) {
		if (!holder) return;
		const who = holder;
		holder.grabLock = .4;
		holder = null;
		carry = 0;
		secure = 0;
		puck.bank = perk(who, "bank");
		puck.vx = Math.cos(ang) * speed;
		puck.vy = Math.sin(ang) * speed;
	}
	function dropPuck() {
		if (!holder) return;
		const who = holder;
		const ang = travelAngle(who);
		who.grabLock = .55;
		holder = null;
		carry = 0;
		secure = 0;
		puck.bank = perk(who, "bank");
		puck.vx = Math.cos(ang) * 180 + who.vx * .3;
		puck.vy = Math.sin(ang) * 180 + who.vy * .3;
	}
	function takePuck(r, from = null) {
		if (from && from !== r) {
			from.grabLock = 1.05;
			shoveApart(from, r);
		}
		holder = r;
		carry = 0;
		secure = .85;
		puck.vx = 0;
		puck.vy = 0;
	}
	function travelAngle(r) {
		if (r.controlled) return liveAim();
		if (Math.hypot(r.vx, r.vy) > 36) return Math.atan2(r.vy, r.vx);
		return attackSign(r.team) > 0 ? 0 : Math.PI;
	}
	function switchSkater() {
		if (gameOver || holder?.team === "home") return;
		const goalie = robots.find((r) => r.team === "home" && r.role === "goalie");
		const s = attackSign("home");
		const carrierX = holder ? holder.x : null;
		const beaten = carrierX !== null && robots.filter((r) => r.team === "home" && r.role !== "goalie").every((r) => (r.x - carrierX) * s > 0);
		if (goalie && beaten) {
			if (human() !== goalie) {
				for (const r of robots) r.controlled = r === goalie;
				facing = Math.hypot(goalie.vx, goalie.vy) > 40 ? Math.atan2(goalie.vy, goalie.vx) : facing;
			}
			return;
		}
		const field = robots.filter((r) => r.team === "home");
		field.sort((a, b) => dist(a, puck) - dist(b, puck));
		if (field.length === 0) return;
		const next = human() === field[0] ? field[1] ?? field[0] : field[0];
		for (const r of robots) r.controlled = r === next;
		facing = Math.hypot(next.vx, next.vy) > 40 ? Math.atan2(next.vy, next.vx) : facing;
	}
	function syncControl() {
		if (holder?.team !== "home") return;
		if (human() === holder) return;
		for (const r of robots) r.controlled = r === holder;
		facing = Math.hypot(holder.vx, holder.vy) > 40 ? Math.atan2(holder.vy, holder.vx) : 0;
	}
	const step = (dt) => {
		shake = Math.max(0, shake - dt * 4);
		for (const ring of rings) ring.age += dt;
		for (let i = rings.length - 1; i >= 0; i--) if (rings[i].age > .4) rings.splice(i, 1);
		for (const r of robots) r.hurt = Math.max(0, r.hurt - dt);
		teamCool.home = Math.max(0, teamCool.home - dt);
		teamCool.away = Math.max(0, teamCool.away - dt);
		if (mode === "count") {
			countLeft = Math.max(0, countLeft - dt);
			if (countLeft === 0) {
				mode = "play";
				openNextDeath();
			}
			return;
		}
		if (mode === "pick" || gameOver) return;
		if (!overtime && faceoff <= 0) {
			timeLeft = Math.max(0, timeLeft - dt);
			if (timeLeft === 0) {
				if (scoreH === scoreA) overtime = true;
				else finish(scoreH > scoreA ? "HOME" : "AWAY");
			}
		}
		faceoff = Math.max(0, faceoff - dt);
		secure = Math.max(0, secure - dt);
		for (const r of robots) r.grabLock = Math.max(0, r.grabLock - dt);
		if (charging) charge = Math.min(1, charge + dt * 1.7);
		tickBoost(human(), down("Space"), dt);
		syncControl();
		drivePlayer(dt);
		driveAi(dt);
		if (faceoff > 0 || gameOver) return;
		for (const r of robots) moveBody(r, dt, 22);
		pushApart(robots);
		if (holder) {
			parentPuck();
			carry += dt;
			if (carry >= carryLimit(holder)) dropPuck();
			else maybeSteal();
		} else {
			slidePuck(dt);
			maybeGrab();
		}
		maybeAiPulse();
		maybeSave();
		if (inMouth() && puck.x < RINK.x + 8) addScore("away");
		else if (inMouth() && puck.x > RINK.x + RINK.w - 8) addScore("home");
	};
	function maybeSave() {
		if (holder) return;
		for (const g of robots) {
			if (g.role !== "goalie" || g.card.kind !== "goalie") continue;
			const own = ownGoalX(g.team);
			if (!(g.team === "home" ? puck.vx < -40 : puck.vx > 40) || Math.abs(puck.x - own) > 150) continue;
			const q = g.card.ratings;
			const reach = 22 + (q.iq * .5 + q.speed * .25 + q.agility * .25 - 1) * 3.1;
			if (dist(g, puck) > reach || Math.abs(puck.y - g.y) > reach) continue;
			const keep = .92 - (q.rebound - 1) * .065;
			const s = attackSign(g.team);
			puck.vx = s * Math.abs(puck.vx) * keep;
			puck.vy *= keep * .65;
			puck.x = g.x + s * 20;
			shake = .12;
			return;
		}
	}
	function tryPulse(r) {
		if (mode !== "play" || gameOver || faceoff > 0 || holder !== r) return;
		if (teamCool[r.team] > 0) return;
		teamCool[r.team] = PULSE_CD;
		rings.push({
			x: r.x,
			y: r.y,
			age: 0
		});
		const hits = robots.filter((o) => o !== r && dist(r, o) < pulseRange(r));
		const knock = pulseKnock(r);
		for (const o of hits) {
			const dx = o.x - r.x;
			const dy = o.y - r.y;
			const d = Math.hypot(dx, dy) || 1;
			const shove = knock * (o.team === r.team ? .85 : 1);
			o.vx += dx / d * shove;
			o.vy += dy / d * shove;
			o.x += dx / d * 12;
			o.y += dy / d * 12;
		}
		for (const o of hits) {
			if (o.role === "goalie") continue;
			if (o.team === r.team && perk(r, "clean")) continue;
			woundRobot(o);
		}
		openNextDeath();
	}
	function maybeAiPulse() {
		const carrier = holder;
		if (!carrier || carrier.controlled || teamCool[carrier.team] > 0) return;
		const range = pulseRange(carrier);
		const near = robots.filter((o) => o !== carrier && dist(o, carrier) < range);
		const foe = near.some((o) => o.team !== carrier.team && o.role !== "goalie");
		const friend = near.some((o) => o.team === carrier.team && o.role !== "goalie");
		const heat = liveShape(carrier.team).heat;
		if (!foe) return;
		if (friend && heat < 72 && carrier.card.styles.physical < 78 && !perk(carrier, "clean")) return;
		tryPulse(carrier);
	}
	function woundRobot(r) {
		if (r.role === "goalie" || r.lives <= 0) return;
		r.lives -= 1;
		r.hurt = .35;
		shake = .35;
		if (r.lives > 0) return;
		if (holder === r) {
			holder = null;
			carry = 0;
			secure = 0;
		}
		const wasYou = r.controlled;
		const team = r.team;
		const role = r.role;
		const at = robots.indexOf(r);
		if (at >= 0) robots.splice(at, 1);
		if (wasYou) {
			const next = robots.find((o) => o.team === "home");
			if (next) next.controlled = true;
		}
		deaths.push({
			team,
			role
		});
		openNextDeath();
	}
	function openNextDeath() {
		if (mode !== "play" || gameOver || deaths.length === 0) return;
		const d = deaths[0];
		const subs = bench[d.team];
		const skaters = robots.filter((o) => o.team === d.team && o.role !== "goalie");
		if (subs.length === 0 && skaters.length === 0) {
			deaths.length = 0;
			blastoff = true;
			note = "";
			finish(d.team === "home" ? "AWAY" : "HOME");
			return;
		}
		deaths.shift();
		openRole = d.role;
		if (subs.length === 0) {
			note = "SHORTHANDED";
			mode = "count";
			countLeft = 3;
			return;
		}
		note = "";
		if (d.team === "away") {
			bringIn(subs[0]);
			mode = "count";
			countLeft = 3;
			return;
		}
		mode = "pick";
	}
	function bringIn(sub) {
		const pile = bench[sub.team];
		const at = pile.indexOf(sub);
		if (at >= 0) pile.splice(at, 1);
		sub.role = openRole;
		sub.x = W / 2;
		sub.y = MID_Y;
		sub.vx = 0;
		sub.vy = 0;
		sub.boosting = false;
		sub.controlled = false;
		robots.push(sub);
		if (!robots.some((o) => o.controlled) && sub.team === "home") sub.controlled = true;
	}
	function chooseSub(index) {
		if (mode !== "pick") return;
		const sub = bench.home[index];
		if (!sub) return;
		bringIn(sub);
		mode = "count";
		countLeft = 3;
	}
	function subCard(index, count) {
		const w = 168;
		return {
			x: (W - (count * w + (count - 1) * 18)) / 2 + index * 186,
			y: H / 2 - 78,
			w,
			h: 156
		};
	}
	function perk(r, name) {
		return r.card.perks.includes(name);
	}
	function agilityOf(r) {
		return r.card.ratings.agility;
	}
	function speedOf(r) {
		return pace(r.card.ratings.speed);
	}
	function shotOf(r) {
		return r.card.kind === "skater" ? r.card.ratings.shot : 5;
	}
	function attackOf(r) {
		return r.card.kind === "skater" ? r.card.ratings.attack : r.card.ratings.iq;
	}
	function defenseOf(r) {
		return r.card.kind === "skater" ? r.card.ratings.defense : r.card.ratings.iq;
	}
	function pulseRange(r) {
		if (r.card.kind === "goalie") return 48;
		return 40 + (r.card.ratings.blastArea - 1) * 6;
	}
	function pulseKnock(r) {
		if (r.card.kind === "goalie") return 140;
		return 90 + (r.card.ratings.blastPower - 1) * 22;
	}
	function carryLimit(r) {
		if (r && perk(r, "sticky")) return 2.75;
		return CARRY_MAX;
	}
	function liveShape(team) {
		let push = baseShape[team].push;
		let share = baseShape[team].share;
		const lead = team === "home" ? scoreH - scoreA : scoreA - scoreH;
		if (lead > 0) push -= 18;
		if (lead < 0) push += 16;
		if (robots.filter((r) => r.team === team && r.role !== "goalie").length < 3) {
			push -= 22;
			share -= 18;
		}
		return {
			...baseShape[team],
			push: clamp(push, 0, 100),
			share: clamp(share, 0, 100)
		};
	}
	function drivePlayer(dt) {
		const you = human();
		let ix = 0;
		let iy = 0;
		if (down("KeyA") || down("ArrowLeft")) ix -= 1;
		if (down("KeyD") || down("ArrowRight")) ix += 1;
		if (down("KeyW") || down("ArrowUp")) iy -= 1;
		if (down("KeyS") || down("ArrowDown")) iy += 1;
		if (stick.id !== -1 && !gameOver) {
			const dx = cursor.x - you.x;
			const dy = cursor.y - you.y;
			if (Math.hypot(dx, dy) > 6) {
				const wish = Math.atan2(dy, dx);
				facing = wish;
				const aim = (you.boosting ? BOOST_SPEED : BASE_SPEED) * speedOf(you);
				const tau = Math.max(.016, .11 - (agilityOf(you) - 1) * .009);
				const blend = 1 - Math.exp(-dt / tau);
				you.vx += (Math.cos(wish) * aim - you.vx) * blend;
				you.vy += (Math.sin(wish) * aim - you.vy) * blend;
			}
			return;
		}
		pointFacing();
		const len = Math.hypot(ix, iy);
		const maxSp = (you.boosting ? BOOST_SPEED : BASE_SPEED) * speedOf(you);
		if (len > .08 && !gameOver) {
			const n = Math.max(1, len);
			const accel = (1100 + agilityOf(you) * 80) * speedOf(you);
			you.vx += ix / n * accel * dt;
			you.vy += iy / n * accel * dt;
			const sp = Math.hypot(you.vx, you.vy);
			if (sp > maxSp) {
				you.vx = you.vx / sp * maxSp;
				you.vy = you.vy / sp * maxSp;
			}
		} else {
			const damp = Math.pow(.04, dt);
			you.vx *= damp;
			you.vy *= damp;
		}
		if (!mouseOwnsAim() && Math.hypot(you.vx, you.vy) > 28 && stick.id === -1) {
			const velAng = Math.atan2(you.vy, you.vx);
			if (len > .08) facing = velAng;
			else {
				const diff = Math.atan2(Math.sin(velAng - facing), Math.cos(velAng - facing));
				if (Math.abs(diff) < .4) facing = velAng;
			}
		}
	}
	function tickBoost(r, want, dt) {
		r.boosting = want && r.boost > .02 && !gameOver;
		const burn = perk(r, "afterburner") ? 1.7 : 1.15;
		const regen = perk(r, "afterburner") ? 1.55 : 2.6;
		if (r.boosting) r.boost = Math.max(0, r.boost - dt / burn);
		else r.boost = Math.min(1, r.boost + dt / regen);
	}
	function wantsBoost(r, chasing) {
		if (r.boost < .12 || gameOver) return false;
		if (r.role === "goalie") return desperate(r) && dist(r, puck) > 64 && dist(r, puck) < 190;
		const opp = nearestOpponent(r);
		if (holder === r) {
			if (opp && dist(r, opp) < 110) return true;
			return canShoot(r) && (!opp || dist(r, opp) > 130);
		}
		if (chasing && dist(r, puck) > 72) return true;
		return !!holder && holder.team !== r.team && attackDepth(r.team, puck.x) < .38 && dist(r, puck) > 150;
	}
	function driveAi(dt) {
		const homeChaser = pickChaser("home");
		const awayChaser = pickChaser("away");
		for (const r of robots) {
			if (r.controlled || gameOver) {
				if (!r.controlled) r.boosting = false;
				continue;
			}
			if (holder === r) {
				tickBoost(r, wantsBoost(r, false), dt);
				thinkWithPuck(r, dt);
				if (r.boosting) {
					const sp = Math.hypot(r.vx, r.vy) || 1;
					const boosted = BOOST_SPEED * speedOf(r);
					r.vx = r.vx / sp * boosted;
					r.vy = r.vy / sp * boosted;
				}
				continue;
			}
			const chasing = r === homeChaser || r === awayChaser;
			tickBoost(r, wantsBoost(r, chasing), dt);
			const spot = chasing ? chasePoint(r) : shapeSpot(r);
			const cruise = (r.role === "goalie" ? desperate(r) ? 242 : 180 : chasing ? 248 : 210) * speedOf(r);
			seek(r, spot.x, spot.y, r.boosting ? BOOST_SPEED * speedOf(r) : cruise, dt);
		}
	}
	function deliver(r, target, speed, preferBounce) {
		const blocked = laneBlocked(r, target, r.team);
		const bounce = wallPoint(r, target, r.team);
		if (bounce && (blocked || preferBounce)) {
			launch(Math.atan2(bounce.y - r.y, bounce.x - r.x), speed);
			return true;
		}
		if (!blocked) {
			launch(Math.atan2(target.y - r.y, target.x - r.x), speed);
			return true;
		}
		return false;
	}
	function thinkWithPuck(r, dt) {
		const s = attackSign(r.team);
		const mate = bestReceiver(r);
		const goal = {
			x: r.team === "home" ? RINK.x + RINK.w - 4 : RINK.x + 4,
			y: MID_Y
		};
		const goalie = robots.find((o) => o.team !== r.team && o.role === "goalie");
		const goalieInLane = !!goalie && dist(goalie, r) > 36 && distToSeg(goalie, r, goal) < 48;
		const shape = liveShape(r.team);
		const habit = habits[r.team];
		const shootBias = r.card.styles.shooter * .55 + (100 - shape.share) * .45;
		const patient = habit.patient / 100;
		const limit = carryLimit(r);
		if (r.role === "goalie" || carry > limit * (.78 - patient * .12)) {
			if (mate && deliver(r, mate, passSpeed(r, mate), true)) return;
			launch(s > 0 ? 0 : Math.PI, 420 * pace(shotOf(r)));
			return;
		}
		const wantShot = canShoot(r, shootBias, habit.earlyShot) && carry > .2 + (1 - shootBias / 100) * .3 + patient * .18;
		const bounceShot = goalieInLane || (r.card.styles.wide + habit.bounce) / 2 > 68;
		if (wantShot && deliver(r, goal, 760 * pace(shotOf(r)), bounceShot)) return;
		if (!!mate && carry > (shootBias > 65 ? .46 : .26) && mate && deliver(r, mate, passSpeed(r, mate), r.card.styles.wide > 52 || habit.bounce > 58)) return;
		let tx = goal.x - s * 70;
		let ty = MID_Y + (r.y < MID_Y ? -1 : 1) * (36 + Math.abs(r.card.styles.wide - 50));
		const opp = nearestOpponent(r);
		if (opp && dist(r, opp) < 78) {
			const side = r.y <= opp.y ? -1 : 1;
			tx = r.x + s * 120;
			ty = r.y + side * 110;
		}
		seek(r, tx, ty, 262 * speedOf(r), dt);
	}
	function passSpeed(r, mate) {
		return clamp(dist(r, mate) * (1.5 + attackOf(r) * .04), 340, 700);
	}
	function parentPuck() {
		if (!holder) return;
		const ang = travelAngle(holder);
		puck.x = holder.x + Math.cos(ang) * 28;
		puck.y = holder.y + Math.sin(ang) * 28;
		puck.vx = holder.vx;
		puck.vy = holder.vy;
	}
	function maybeSteal() {
		if (!holder || secure > 0) return;
		for (const r of robots) {
			if (r.team === holder.team || r.grabLock > 0) continue;
			const reach = clamp((perk(holder, "glue") ? 16 : 26) + (defenseOf(r) - defenseOf(holder)) * .9, 12, 34);
			if (dist(r, puck) < reach) {
				takePuck(r, holder);
				return;
			}
		}
	}
	function maybeGrab() {
		if (faceoff > 0) return;
		let best = null;
		let bestD = 60;
		for (const r of robots) {
			if (r.grabLock > 0) continue;
			const reach = perk(r, "pickup") ? 46 : 30;
			const d = dist(r, puck);
			if (d < reach && d < bestD) {
				bestD = d;
				best = r;
			}
		}
		if (best) takePuck(best);
	}
	function slidePuck(dt) {
		const damp = Math.pow(.78, dt);
		puck.vx *= damp;
		puck.vy *= damp;
		if (Math.hypot(puck.vx, puck.vy) < 12) {
			puck.vx = 0;
			puck.vy = 0;
		}
		puck.x += puck.vx * dt;
		puck.y += puck.vy * dt;
		const minY = RINK.y + 14;
		const maxY = RINK.y + RINK.h - 14;
		const keep = puck.bank ? .96 : .8;
		if (puck.y < minY) {
			puck.y = minY;
			puck.vy = Math.abs(puck.vy) * keep;
		} else if (puck.y > maxY) {
			puck.y = maxY;
			puck.vy = -Math.abs(puck.vy) * keep;
		}
		const mouth = inMouth();
		const minX = RINK.x + 14;
		const maxX = RINK.x + RINK.w - 14;
		if (!mouth && puck.x < minX) {
			puck.x = minX;
			puck.vx = Math.abs(puck.vx) * keep;
		} else if (!mouth && puck.x > maxX) {
			puck.x = maxX;
			puck.vx = -Math.abs(puck.vx) * keep;
		}
	}
	function inMouth() {
		return puck.y > MID_Y - GOAL_HALF && puck.y < MID_Y + GOAL_HALF;
	}
	function pickChaser(team) {
		if (holder?.team === team) return null;
		const field = robots.filter((r) => r.team === team && r.role !== "goalie" && !r.controlled);
		if (field.length === 0) return null;
		const depth = attackDepth(team, puck.x);
		const prefer = depth < .36 ? "defender" : depth < .66 ? "mid" : "attacker";
		const preferred = field.find((r) => r.role === prefer) ?? field[0];
		let closest = field[0];
		for (const r of field) if (dist(r, puck) < dist(closest, puck)) closest = r;
		if (dist(preferred, puck) < dist(closest, puck) + 160) return preferred;
		return closest;
	}
	function chasePoint(r) {
		if (r.grabLock > .15) return shapeSpot(r);
		if (holder && holder.team !== r.team) {
			const dx = r.x - holder.x;
			const dy = r.y - holder.y;
			const d = Math.hypot(dx, dy);
			if (d < 14) {
				const s = attackSign(r.team);
				return {
					x: holder.x - s * 90,
					y: holder.y + (r.y < holder.y ? -70 : 70)
				};
			}
			const stand = secure > 0 ? 88 : 52;
			return {
				x: holder.x + dx / d * stand,
				y: holder.y + dy / d * stand
			};
		}
		return {
			x: puck.x,
			y: puck.y
		};
	}
	function nearestOpponent(r) {
		let best = null;
		let bestD = 1e9;
		for (const o of robots) {
			if (o.team === r.team) continue;
			const d = dist(r, o);
			if (d < bestD) {
				bestD = d;
				best = o;
			}
		}
		return best;
	}
	function onAttack(team) {
		if (holder?.team === team) return true;
		if (holder) return false;
		return attackDepth(team, puck.x) >= .5;
	}
	function shapeSpot(r) {
		const s = attackSign(r.team);
		const own = ownGoalX(r.team);
		const opp = ownGoalX(r.team === "home" ? "away" : "home");
		if (r.role === "goalie" && r.card.kind === "goalie") {
			const q = r.card.ratings;
			const track = .3 + q.iq / 11 * .7;
			let y = MID_Y + (clamp(puck.y, MID_Y - GOAL_HALF, MID_Y + GOAL_HALF) - MID_Y) * track;
			y += Math.sin(r.hover + performance.now() / 480) * Math.max(0, 7 - q.composure) * 4;
			let x = own + s * (18 + Math.max(0, 8 - q.composure) * 1.6);
			if (desperate(r)) {
				const dare = (11 - q.composure) / 10;
				const reachOut = 24 + dare * 110;
				const lo = Math.min(own, own + s * reachOut);
				const hi = Math.max(own, own + s * reachOut);
				x = clamp(puck.x - s * 16, lo, hi);
				y = clamp(puck.y, MID_Y - 70 - dare * 30, MID_Y + 70 + dare * 30);
			}
			return {
				x,
				y
			};
		}
		const atk = onAttack(r.team);
		const lead = holder?.team === r.team ? holder : puck;
		const high = lead.y < MID_Y;
		let x = r.x;
		let y = r.y;
		if (!atk) {
			const other = r.team === "home" ? "away" : "home";
			if (holder ? holder.team === other && attackDepth(other, puck.x) < .4 : attackDepth(r.team, puck.x) > .58) {
				if (r.role === "attacker") {
					x = puck.x + s * 62;
					y = puck.y + (puck.y < MID_Y ? 64 : -64);
				} else if (r.role === "mid") {
					x = puck.x - s * 8;
					y = puck.y + (puck.y < MID_Y ? -76 : 76);
				} else {
					x = own + s * 420;
					y = MID_Y + (puck.y - MID_Y) * .45;
				}
			} else if (r.role === "defender") {
				x = own + s * 88;
				y = puck.y + (high ? 78 : -78);
			} else if (r.role === "mid") {
				x = own + s * 168;
				y = puck.y + (high ? -55 : 55);
			} else {
				x = own + s * 255;
				y = puck.y + (high ? 30 : -100);
			}
		} else if (r.role === "attacker") {
			x = opp - s * 88;
			y = high ? MID_Y + 118 : MID_Y - 118;
		} else if (r.role === "mid") {
			x = lead.x + s * 150;
			y = high ? MID_Y - 125 : MID_Y + 125;
		} else {
			x = lead.x - s * 145;
			y = high ? MID_Y + 95 : MID_Y - 95;
		}
		const spot = {
			x: clamp(x, RINK.x + 52, RINK.x + RINK.w - 52),
			y: clamp(y, RINK.y + 56, RINK.y + RINK.h - 56)
		};
		const oppNear = nearestOpponentAt(spot, r.team);
		if (oppNear && dist(spot, oppNear) < 68) spot.y += spot.y < oppNear.y ? -56 : 56;
		const shape = liveShape(r.team);
		const habit = habits[r.team];
		const mixed = r.card.styles.aggressive * .65 + shape.push * .35;
		spot.x += s * ((mixed - 50) / 50) * 86;
		const wide = (r.card.styles.wide * .7 + shape.width * .3 - 50) / 50;
		spot.y += (spot.y < MID_Y ? -1 : 1) * wide * 48;
		if (!atk && r.card.kind === "skater") spot.x -= s * ((defenseOf(r) - 5) * 7 - (r.card.styles.physical - 50) / 50 * 26);
		if (habit.crash > 64 && r.role === "attacker") spot.x = opp - s * (78 - habit.crash * .25);
		spot.x = clamp(spot.x, RINK.x + 52, RINK.x + RINK.w - 52);
		spot.y = clamp(spot.y, RINK.y + 56, RINK.y + RINK.h - 56);
		return spot;
	}
	function nearestOpponentAt(p, team) {
		let best = null;
		let bestD = 1e9;
		for (const o of robots) {
			if (o.team === team) continue;
			const d = dist(p, o);
			if (d < bestD) {
				bestD = d;
				best = o;
			}
		}
		return best;
	}
	function laneBlocked(a, b, team, pad = 32) {
		for (const o of robots) {
			if (o.team === team) continue;
			if (dist(o, a) < 24) continue;
			if (distToSeg(o, a, b) < pad) return true;
		}
		return false;
	}
	function wallPoint(from, to, team) {
		const walls = [RINK.y + 16, RINK.y + RINK.h - 16];
		let best = null;
		let bestTravel = 1e9;
		for (const wy of walls) {
			const dy = wy * 2 - to.y - from.y;
			const dx = to.x - from.x;
			if (Math.abs(dy) < 10) continue;
			const t = (wy - from.y) / dy;
			if (t < .15 || t > .9) continue;
			const bx = from.x + dx * t;
			if (bx < RINK.x + 48 || bx > RINK.x + RINK.w - 48) continue;
			const bounce = {
				x: bx,
				y: wy
			};
			if (laneBlocked(from, bounce, team)) continue;
			if (laneBlocked(bounce, to, team)) continue;
			const travel = dist(from, bounce) + dist(bounce, to);
			if (travel > 980 || travel >= bestTravel) continue;
			bestTravel = travel;
			best = bounce;
		}
		return best;
	}
	function desperate(r) {
		const own = ownGoalX(r.team);
		if (!(Math.abs(puck.x - own) < 150 && Math.abs(puck.y - MID_Y) < 134)) return false;
		return !robots.some((o) => o !== r && o.team === r.team && o.role !== "goalie" && dist(o, puck) < 110);
	}
	function canShoot(r, shootBias = 50, early = 0) {
		if (r.role === "goalie") return false;
		if (r.role === "defender" && shootBias < 72 && early < 70) return false;
		const gx = r.team === "home" ? RINK.x + RINK.w : RINK.x;
		return Math.abs(gx - r.x) < 260 + shootBias * .7 + early && Math.abs(r.y - MID_Y) < 150 + early * .35;
	}
	function bestReceiver(from) {
		const s = attackSign(from.team);
		const goal = {
			x: from.team === "home" ? RINK.x + RINK.w : RINK.x,
			y: MID_Y
		};
		const risk = habits[from.team].risk;
		const minSpace = clamp(86 - risk * .58, 26, 86);
		const lanePad = clamp(42 - risk * .24, 16, 42);
		let best = null;
		let bestScore = 110;
		for (const o of robots) {
			if (o === from || o.team !== from.team || o.role === "goalie") continue;
			const d = dist(from, o);
			if (d < 75 || d > 500) continue;
			if (laneBlocked(from, o, from.team, lanePad)) continue;
			let space = 999;
			for (const opp of robots) {
				if (opp.team === from.team) continue;
				space = Math.min(space, dist(o, opp));
			}
			if (space < minSpace) continue;
			const ahead = (o.x - from.x) * s;
			const shot = !laneBlocked(o, goal, from.team, lanePad) && Math.abs(o.x - goal.x) < 360 ? 100 : 0;
			const score = space * 1.5 + ahead * .4 + shot;
			if (score > bestScore) {
				bestScore = score;
				best = o;
			}
		}
		return best;
	}
	function addScore(who) {
		if (who === "home") scoreH += 1;
		else scoreA += 1;
		shake = .4;
		holder = null;
		carry = 0;
		puck.x = W / 2;
		puck.y = MID_Y;
		puck.vx = 0;
		puck.vy = 0;
		for (const r of robots) {
			const p = spot(r.team, r.role);
			r.x = p.x;
			r.y = p.y;
			r.vx = 0;
			r.vy = 0;
			r.grabLock = .3;
			r.boost = 1;
			r.boosting = false;
			r.controlled = r.team === "home" && r.role === "attacker";
		}
		facing = 0;
		faceoff = .7;
		if (scoreH >= 5 || scoreA >= 5 || overtime) finish(scoreH >= scoreA ? "HOME" : "AWAY");
	}
	function finish(name) {
		gameOver = true;
		winner = name;
	}
	const draw = (time) => {
		fitCanvas(canvas, ctx, view);
		ctx.save();
		if (shake > 0) ctx.translate((Math.random() - .5) * shake * 16, (Math.random() - .5) * shake * 16);
		paintWorld(ctx, time, {
			robots,
			puck,
			holder,
			carry,
			carryMax: carryLimit(holder),
			player: human(),
			facing,
			charging,
			charge,
			boost: human().boost,
			boosting: human().boosting,
			stick,
			scoreH,
			scoreA,
			timeLeft,
			overtime,
			gameOver,
			winner,
			faceoff,
			passBtn,
			shotBtn,
			blastBtn,
			ownPuck: holder?.team === "home",
			aimOn: cursor.on,
			aimX: cursor.x,
			aimY: cursor.y,
			mode,
			countLeft,
			note,
			blastoff,
			rings,
			subs: bench.home,
			pulse: teamCool.home
		});
		ctx.restore();
	};
	const frame = (now) => {
		if (!running) return;
		const dt = Math.min(.033, (now - last) / 1e3);
		last = now;
		measure();
		step(dt);
		draw((now - t0) / 1e3);
		placeAim();
		raf = requestAnimationFrame(frame);
	};
	raf = requestAnimationFrame(frame);
	return { destroy() {
		running = false;
		cancelAnimationFrame(raf);
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("keyup", onKeyUp);
		window.removeEventListener("blur", onBlur);
		window.removeEventListener("pointerdown", onPointerDown);
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerUp);
		window.removeEventListener("pointerrawupdate", onPointerMove);
		window.removeEventListener("resize", measure);
		aimEl.remove();
		delete window.__controlsTest;
	} };
}
function spawnMatch(match) {
	const roles = [
		"attacker",
		"mid",
		"defender",
		"goalie"
	];
	return {
		robots: [...match.home.ice.map((card, i) => robotFrom(card, "home", roles[i], i, i === 0, false)), ...match.away.ice.map((card, i) => robotFrom(card, "away", roles[i], i, false, false))],
		bench: {
			home: match.home.bench.map((card, i) => robotFrom(card, "home", "mid", i, false, true)),
			away: match.away.bench.map((card, i) => robotFrom(card, "away", "mid", i, false, true))
		}
	};
}
function robotFrom(card, team, role, i, controlled, sub) {
	const p = sub ? {
		x: -300,
		y: -300
	} : spot(team, role);
	return {
		x: p.x,
		y: p.y,
		vx: 0,
		vy: 0,
		team,
		role,
		controlled,
		hover: i * 1.4 + (sub ? 3 : 0),
		hue: card.hue,
		visor: card.visor,
		antenna: card.antenna,
		grabLock: 0,
		boost: 1,
		boosting: false,
		lives: 3,
		pulse: 0,
		hurt: 0,
		name: card.name,
		card
	};
}
function spot(team, role) {
	const s = attackSign(team);
	const own = ownGoalX(team);
	if (role === "goalie") return {
		x: own + s * 26,
		y: MID_Y
	};
	if (role === "defender") return {
		x: own + s * 180,
		y: MID_Y + 80
	};
	if (role === "mid") return {
		x: W / 2 - s * 90,
		y: MID_Y - 70
	};
	return {
		x: W / 2 - s * 10,
		y: MID_Y + 24
	};
}
function ownGoalX(team) {
	return team === "home" ? RINK.x + 30 : RINK.x + RINK.w - 30;
}
function attackSign(team) {
	return team === "home" ? 1 : -1;
}
function attackDepth(team, x) {
	const own = ownGoalX(team);
	const opp = ownGoalX(team === "home" ? "away" : "home");
	return clamp((x - own) / (opp - own), 0, 1);
}
function seek(r, tx, ty, speed, dt = 1 / 60) {
	const dx = tx - r.x;
	const dy = ty - r.y;
	const d = Math.hypot(dx, dy) || 1;
	if (d < 10) {
		r.vx *= .7;
		r.vy *= .7;
		return;
	}
	const sp = d < 36 ? speed * (d / 36) : speed;
	const tau = Math.max(.02, .12 - (r.card.ratings.agility - 1) * .01);
	const blend = 1 - Math.exp(-dt / tau);
	r.vx += (dx / d * sp - r.vx) * blend;
	r.vy += (dy / d * sp - r.vy) * blend;
}
function dist(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
function distToSeg(p, a, b) {
	const abx = b.x - a.x;
	const aby = b.y - a.y;
	const den = abx * abx + aby * aby || 1;
	const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / den, 0, 1);
	return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}
function moveBody(r, dt, radius) {
	r.x += r.vx * dt;
	r.y += r.vy * dt;
	const minX = RINK.x + radius;
	const maxX = RINK.x + RINK.w - radius;
	const minY = RINK.y + radius;
	const maxY = RINK.y + RINK.h - radius;
	if (r.x < minX) {
		r.x = minX;
		r.vx *= -.2;
	} else if (r.x > maxX) {
		r.x = maxX;
		r.vx *= -.2;
	}
	if (r.y < minY) {
		r.y = minY;
		r.vy *= -.2;
	} else if (r.y > maxY) {
		r.y = maxY;
		r.vy *= -.2;
	}
}
function shoveApart(a, b) {
	let dx = b.x - a.x;
	let dy = b.y - a.y;
	let d = Math.hypot(dx, dy);
	if (d < 1) {
		dx = attackSign(b.team);
		dy = .4;
		d = Math.hypot(dx, dy);
	}
	const nx = dx / d;
	const ny = dy / d;
	a.x -= nx * 36;
	a.y -= ny * 36;
	b.x += nx * 36;
	b.y += ny * 36;
	a.vx = -nx * 160;
	a.vy = -ny * 80;
	b.vx = nx * 80 + attackSign(b.team) * 200;
	b.vy = ny * 40;
}
function pushApart(list) {
	for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
		const a = list[i];
		const b = list[j];
		let dx = b.x - a.x;
		let dy = b.y - a.y;
		let d = Math.hypot(dx, dy);
		if (d < .5) {
			dx = 1;
			dy = .35;
			d = Math.hypot(dx, dy);
		}
		const min = a.team !== b.team ? 58 : 46;
		if (d >= min) continue;
		const heavyA = a.card.perks.includes("heavy") ? 1 : 0;
		const heavyB = b.card.perks.includes("heavy") ? 1 : 0;
		const push = (min - d) / 2 * (1 + .45 * (heavyB - heavyA));
		a.x -= dx / d * push;
		a.y -= dy / d * push;
		b.x += dx / d * push;
		b.y += dy / d * push;
		const shove = 28 * (1 + heavyA + heavyB);
		a.vx -= dx / d * shove * (.6 + heavyB);
		a.vy -= dy / d * shove * (.6 + heavyB);
		b.vx += dx / d * shove * (.6 + heavyA);
		b.vy += dy / d * shove * (.6 + heavyA);
	}
}
function hitBtn(b, p) {
	return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}
function fitCanvas(canvas, c, view) {
	c.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
	c.fillStyle = "#070b18";
	c.fillRect(-400, -400, 2e3, 1500);
}
function paintWorld(c, time, s) {
	const sky = c.createLinearGradient(0, 0, 0, H);
	sky.addColorStop(0, "#160b2e");
	sky.addColorStop(.5, "#07111f");
	sky.addColorStop(1, "#04141c");
	c.fillStyle = sky;
	c.fillRect(0, 0, W, H);
	c.fillStyle = "rgba(190, 220, 255, 0.7)";
	for (let i = 0; i < 36; i++) {
		const x = (i * 89 + Math.sin(time * .15 + i) * 6) % W;
		c.fillRect(x, i * 41 % 130, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
	}
	for (let i = 0; i < 46; i++) {
		c.fillStyle = i % 2 ? "rgba(120,180,255,0.75)" : "rgba(230,140,255,0.7)";
		c.beginPath();
		c.arc(90 + i * 37 % 1020, 40 + i % 3 * 18 + Math.sin(time * 3 + i) * 2, 4 + i % 3, 0, Math.PI * 2);
		c.fill();
	}
	c.fillStyle = "rgba(140, 210, 255, 0.18)";
	roundRect(c, RINK.x, RINK.y, RINK.w, RINK.h, 26);
	c.fill();
	c.lineWidth = 3;
	c.strokeStyle = "rgba(255,255,255,0.88)";
	c.stroke();
	c.strokeStyle = "rgba(255,255,255,0.4)";
	c.lineWidth = 2;
	c.beginPath();
	c.moveTo(W / 2, RINK.y + 12);
	c.lineTo(W / 2, RINK.y + RINK.h - 12);
	c.stroke();
	c.beginPath();
	c.arc(W / 2, MID_Y, 52, 0, Math.PI * 2);
	c.stroke();
	strokeGoal(c, RINK.x, 1, "#ff6b8a");
	strokeGoal(c, RINK.x + RINK.w, -1, "#7eb0ff");
	for (const ring of s.rings) {
		c.strokeStyle = `rgba(255, 120, 90, ${1 - ring.age / .4})`;
		c.lineWidth = 3;
		c.beginPath();
		c.arc(ring.x, ring.y, 16 + ring.age * 90, 0, Math.PI * 2);
		c.stroke();
	}
	for (const r of s.robots) paintRobot(c, r, time, s.holder === r, s.carry, s.carryMax, r.boosting, s.holder === r && r.team === "home" ? s.pulse : 0);
	c.fillStyle = "#090b10";
	c.beginPath();
	c.arc(s.puck.x, s.puck.y, 11, 0, Math.PI * 2);
	c.fill();
	c.lineWidth = 2;
	c.strokeStyle = s.holder ? "#ffe36b" : "#f5f7ff";
	c.stroke();
	c.fillStyle = "#f4f7ff";
	c.font = "700 36px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "center";
	c.fillText(`${s.scoreH}  –  ${s.scoreA}`, W / 2, 78);
	c.font = "600 14px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "left";
	c.fillStyle = "rgba(220,232,255,0.78)";
	c.fillText(`SUBS ${s.subs.length}`, 96, 78);
	c.font = "600 20px ui-sans-serif, system-ui, sans-serif";
	c.fillStyle = s.overtime ? "#ffe36b" : "#9ad7ff";
	const m = Math.floor(s.timeLeft / 60);
	const sec = Math.floor(s.timeLeft % 60);
	c.fillText(s.overtime ? "GOLDEN GOAL" : `${m}:${sec.toString().padStart(2, "0")}`, W / 2, 108);
	c.fillStyle = "rgba(220,232,255,0.8)";
	c.font = "600 13px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "left";
	c.fillText("BOOST", 96, 652);
	roundRect(c, 148, 640, 160, 10, 5);
	c.strokeStyle = "rgba(255,255,255,0.35)";
	c.lineWidth = 1;
	c.stroke();
	c.fillStyle = s.boost > .25 ? "#7ee7ff" : "#ff8b6b";
	roundRect(c, 148, 640, 160 * s.boost, 10, 5);
	c.fill();
	c.fillStyle = "rgba(220,232,255,0.72)";
	c.font = "500 14px ui-sans-serif, system-ui, sans-serif";
	c.fillText("L blast with the puck  ·  J pass  ·  K shoot", 96, 678);
	paintButton(c, s.blastBtn, s.pulse > 0 ? String(Math.ceil(s.pulse)) : "BLAST", false);
	paintButton(c, s.passBtn, s.ownPuck ? "PASS" : "SWAP", s.charging === "pass");
	paintButton(c, s.shotBtn, "SHOOT", s.charging === "shot");
	if (s.gameOver) banner(c, s.blastoff ? `${s.winner} BLASTOFF` : `${s.winner} WINS`);
	else if (s.mode === "pick") paintSubs(c, s.subs);
	else if (s.mode === "count") {
		banner(c, String(Math.max(1, Math.ceil(s.countLeft))));
		if (s.note) {
			c.font = "700 18px ui-sans-serif, system-ui, sans-serif";
			c.fillStyle = "#ffb4a8";
			c.fillText(s.note, W / 2, 398);
		}
	} else if (s.faceoff > 0 && s.scoreH + s.scoreA > 0) banner(c, "FACEOFF");
}
function paintButton(c, b, label, hot) {
	c.fillStyle = hot ? "rgba(255, 227, 107, 0.92)" : "rgba(8, 16, 32, 0.72)";
	roundRect(c, b.x, b.y, b.w, b.h, 10);
	c.fill();
	c.lineWidth = 2;
	c.strokeStyle = hot ? "#fff4c2" : "rgba(180, 220, 255, 0.7)";
	c.stroke();
	c.fillStyle = hot ? "#1a1404" : "#e7f4ff";
	c.font = "700 15px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "center";
	c.fillText(label, b.x + b.w / 2, b.y + 32);
}
function paintSubs(c, subs) {
	c.fillStyle = "rgba(4, 8, 18, 0.62)";
	c.fillRect(0, 0, W, H);
	c.fillStyle = "#f7f8ff";
	c.font = "800 28px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "center";
	c.fillText("CHOOSE A SUB", W / 2, H / 2 - 118);
	c.font = "500 15px ui-sans-serif, system-ui, sans-serif";
	c.fillStyle = "rgba(220,232,255,0.8)";
	c.fillText("They drop in at center ice", W / 2, H / 2 - 94);
	subs.forEach((sub, i) => {
		const w = 168;
		const x = (W - (subs.length * w + Math.max(0, subs.length - 1) * 18)) / 2 + i * 186;
		const y = H / 2 - 78;
		c.fillStyle = "rgba(8, 16, 32, 0.92)";
		roundRect(c, x, y, w, 156, 14);
		c.fill();
		c.lineWidth = 2;
		c.strokeStyle = "rgba(180, 220, 255, 0.75)";
		c.stroke();
		c.fillStyle = `hsl(${sub.hue} 88% 62%)`;
		c.beginPath();
		c.arc(x + w / 2, 320, 22, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#f4f7ff";
		c.font = "700 16px ui-sans-serif, system-ui, sans-serif";
		c.fillText(sub.name, x + w / 2, 368);
		c.font = "500 13px ui-sans-serif, system-ui, sans-serif";
		c.fillStyle = "rgba(220,232,255,0.75)";
		c.fillText("PRESS " + (i + 1), x + w / 2, 394);
	});
}
function paintRobot(c, r, time, holding, carry, carryMax, boosting, cool) {
	const bob = Math.sin(time * 3.1 + r.hover) * 5;
	const y = r.y + bob;
	if (boosting) {
		const ang = Math.atan2(r.vy, r.vx) + Math.PI;
		c.fillStyle = "rgba(255, 196, 87, 0.9)";
		c.beginPath();
		c.moveTo(r.x + Math.cos(ang) * 18, y + Math.sin(ang) * 18);
		c.lineTo(r.x + Math.cos(ang + .5) * 8, y + Math.sin(ang + .5) * 8);
		c.lineTo(r.x + Math.cos(ang) * (28 + time * 20 % 10), y + Math.sin(ang) * (28 + time * 20 % 10));
		c.fill();
	}
	c.fillStyle = "rgba(0,0,0,0.3)";
	c.beginPath();
	c.ellipse(r.x, r.y + 22, 16, 5, 0, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = `hsl(${r.hue} 88% 62%)`;
	c.beginPath();
	c.arc(r.x, y, 20, 0, Math.PI * 2);
	c.fill();
	c.lineWidth = r.controlled ? 4 : 2;
	c.strokeStyle = r.controlled ? "#ffe36b" : "rgba(255,255,255,0.9)";
	c.stroke();
	if (r.role !== "goalie") for (let i = 0; i < 3; i++) {
		c.fillStyle = i < r.lives ? "#ff7a66" : "rgba(255,255,255,0.28)";
		c.beginPath();
		c.arc(r.x - 10 + i * 10, y - 30, 3.2, 0, Math.PI * 2);
		c.fill();
	}
	if (cool > 0) {
		c.strokeStyle = "rgba(255,120,90,0.9)";
		c.lineWidth = 3;
		c.beginPath();
		c.arc(r.x, y, 25, -Math.PI / 2, -Math.PI / 2 + cool / PULSE_CD * Math.PI * 2);
		c.stroke();
	}
	if (r.hurt > 0) {
		c.strokeStyle = `rgba(255,255,255,${r.hurt / .35})`;
		c.lineWidth = 3;
		c.beginPath();
		c.arc(r.x, y, 23, 0, Math.PI * 2);
		c.stroke();
	}
	if (holding) {
		c.beginPath();
		c.arc(r.x, y, 27, -Math.PI / 2, -Math.PI / 2 + carry / carryMax * Math.PI * 2);
		c.strokeStyle = carry > carryMax * .75 ? "#ff6b6b" : "#ffe36b";
		c.lineWidth = 3;
		c.stroke();
	}
	c.fillStyle = "#071018";
	if (r.visor === 0) c.fillRect(r.x - 9, y - 4, 18, 6);
	else if (r.visor === 1) {
		c.beginPath();
		c.arc(r.x, y - 1, 6, 0, Math.PI * 2);
		c.fill();
	} else {
		c.fillRect(r.x - 10, y - 6, 8, 8);
		c.fillRect(r.x + 2, y - 6, 8, 8);
	}
	c.strokeStyle = `hsl(${r.hue} 88% 72%)`;
	c.lineWidth = 2;
	c.beginPath();
	if (r.antenna === 1) {
		c.moveTo(r.x - 6, y - 18);
		c.lineTo(r.x - 11, y - 30);
		c.moveTo(r.x + 6, y - 18);
		c.lineTo(r.x + 11, y - 30);
	} else if (r.antenna === 2) {
		c.moveTo(r.x - 5, y - 18);
		c.lineTo(r.x, y - 32);
		c.lineTo(r.x + 5, y - 18);
	} else if (r.antenna === 3) {
		c.moveTo(r.x, y - 20);
		c.lineTo(r.x + 9, y - 30);
	} else {
		c.moveTo(r.x, y - 20);
		c.lineTo(r.x, y - 32);
	}
	c.stroke();
	c.fillStyle = "rgba(244,247,255,0.85)";
	c.font = "700 11px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "center";
	c.fillText(r.role === "goalie" ? "G" : r.role === "defender" ? "D" : r.role === "mid" ? "M" : "A", r.x, y + 36);
}
function strokeGoal(c, x, dir, color) {
	c.strokeStyle = color;
	c.lineWidth = 6;
	c.beginPath();
	c.moveTo(x, MID_Y - GOAL_HALF);
	c.lineTo(x - dir * 26, MID_Y - GOAL_HALF);
	c.lineTo(x - dir * 26, MID_Y + GOAL_HALF);
	c.lineTo(x, MID_Y + GOAL_HALF);
	c.stroke();
}
function banner(c, text) {
	c.fillStyle = "rgba(4, 8, 18, 0.55)";
	c.fillRect(0, H / 2 - 44, W, 88);
	c.fillStyle = "#f7f8ff";
	c.font = "800 40px ui-sans-serif, system-ui, sans-serif";
	c.textAlign = "center";
	c.fillText(text, W / 2, 362);
}
function roundRect(c, x, y, w, h, r) {
	c.beginPath();
	c.moveTo(x + r, y);
	c.arcTo(x + w, y, x + w, y + h, r);
	c.arcTo(x + w, y + h, x, y + h, r);
	c.arcTo(x, y + h, x, y, r);
	c.arcTo(x, y, x + w, y, r);
	c.closePath();
}
function clamp(n, a, b) {
	return Math.max(a, Math.min(b, n));
}
function Home() {
	const [match, setMatch] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-[#070b18]",
		children: match ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rink, {
			match,
			onRoster: () => setMatch(null)
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RosterPicker, { onPlay: setMatch })
	});
}
function Rink({ match, onRoster }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const game = mountSpaceHockey(canvas, match);
		return () => game.destroy();
	}, [match]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "block h-full w-full touch-none",
		"aria-label": "Space Hockey rink"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: onRoster,
		className: "absolute left-4 top-3 z-10 rounded-full border border-white/20 bg-[#070b18]/80 px-3 py-1 text-xs font-semibold text-[#d5e8ff]",
		children: "Roster"
	})] });
}
//#endregion
export { Home as component };
