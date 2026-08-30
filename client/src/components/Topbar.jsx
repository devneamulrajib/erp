import {
  Search,
  Grid2X2,
  Bell,
  Sun,
  Settings,
  ChevronDown,
} from 'lucide-react';

import ModuleNav from './ModuleNav';

export default function Topbar() {
  return (
    <header className="relative z-[9999] w-full">
      {/* =====================================================
          TOP HEADER
      ====================================================== */}
      <div
        className="
          relative
          z-[9999]
          h-[78px]
          w-full
          overflow-visible
          border-b
          border-[#e5e5e5]
          bg-white
        "
      >
        {/* ===================================================
            BACKGROUND
        ==================================================== */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <svg
            viewBox="0 0 1600 180"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width="1600"
              height="180"
              fill="#fafafa"
            />

            <path
              d="
                M0 0
                H1600
                V48
                C1460 68 1370 25 1230 45
                C1080 67 980 25 830 46
                C680 68 570 25 420 48
                C270 70 130 32 0 58
                Z
              "
              fill="#f3f3f3"
            />

            <path
              d="
                M0 0
                H1600
                V28
                C1450 48 1360 10 1220 30
                C1070 52 960 12 820 32
                C670 53 550 11 400 32
                C250 53 120 20 0 42
                Z
              "
              fill="#f8f8f8"
            />

            <g
              opacity="0.55"
              stroke="#c4c4c4"
              strokeWidth="1.5"
            >
              <rect
                x="80"
                y="67"
                width="65"
                height="113"
                fill="#f4f4f4"
              />

              <rect
                x="152"
                y="52"
                width="75"
                height="128"
                fill="#fafafa"
              />

              <rect
                x="235"
                y="78"
                width="62"
                height="102"
                fill="#f2f2f2"
              />

              <rect
                x="305"
                y="42"
                width="60"
                height="138"
                fill="#f8f8f8"
              />

              <rect
                x="430"
                y="82"
                width="72"
                height="98"
                fill="#f4f4f4"
              />

              <rect
                x="510"
                y="60"
                width="90"
                height="120"
                fill="#fafafa"
              />

              <rect
                x="608"
                y="88"
                width="68"
                height="92"
                fill="#f5f5f5"
              />

              <path
                d="
                  M1240 180
                  V66
                  L1350 42
                  L1480 66
                  V180
                  Z
                "
                fill="#f5f5f5"
              />

              <path
                d="
                  M1350 42
                  V180
                  H1480
                  V66
                  Z
                "
                fill="#eeeeee"
              />

              <rect
                x="1510"
                y="82"
                width="55"
                height="98"
                fill="#f6f6f6"
              />
            </g>

            <g
              stroke="#c1c1c1"
              strokeWidth="2"
              opacity="0.45"
            >
              <path d="M98 83V94" />
              <path d="M122 83V94" />
              <path d="M98 108V119" />
              <path d="M122 108V119" />

              <path d="M172 70V82" />
              <path d="M198 70V82" />
              <path d="M172 97V109" />
              <path d="M198 97V109" />

              <path d="M324 58V72" />
              <path d="M347 58V72" />
              <path d="M324 86V100" />
              <path d="M347 86V100" />

              <path d="M530 76V88" />
              <path d="M557 76V88" />
              <path d="M584 76V88" />

              <path d="M530 103V115" />
              <path d="M557 103V115" />
              <path d="M584 103V115" />
            </g>

            <g
              fill="#d0d0d0"
              opacity="0.6"
            >
              <circle cx="45" cy="148" r="18" />
              <circle cx="395" cy="151" r="21" />
              <circle cx="710" cy="153" r="18" />
              <circle cx="1190" cy="149" r="22" />
              <circle cx="1540" cy="145" r="24" />
            </g>

            <g
              stroke="#a8a8a8"
              strokeWidth="2"
              fill="none"
              opacity="0.45"
            >
              <path d="M15 155H180" />
              <path d="M55 155L70 72" />
              <path d="M70 72L86 155" />
              <path d="M70 72H175" />
            </g>

            <circle
              cx="1040"
              cy="66"
              r="27"
              fill="#eeeeee"
              opacity="0.6"
            />

            <path
              d="M0 177H1600"
              stroke="#bdbdbd"
              strokeWidth="2"
              opacity="0.45"
            />
          </svg>
        </div>

        {/* ===================================================
            CONTENT
        ==================================================== */}
        <div
          className="
            relative
            z-10
            mx-auto
            flex
            h-full
            w-full
            max-w-[1440px]
            items-center
            px-4
            sm:px-6
            lg:px-8
          "
        >
          {/* =================================================
              BRAND
          ================================================== */}
          <div className="flex min-w-fit items-center">
            <div
              className="
                flex
                h-[44px]
                w-[44px]
                items-center
                justify-center
                rounded-[13px]
                bg-black
              "
            >
              <div className="relative h-[25px] w-[25px]">
                <div
                  className="
                    absolute
                    left-[1px]
                    top-[1px]
                    h-[17px]
                    w-[17px]
                    rotate-45
                    rounded-[2px]
                    border-[2.5px]
                    border-white
                  "
                />

                <div
                  className="
                    absolute
                    bottom-[1px]
                    right-[1px]
                    h-[12px]
                    w-[12px]
                    rotate-45
                    rounded-[2px]
                    border-[2.5px]
                    border-[#999]
                  "
                />
              </div>
            </div>

            <div className="ml-3 hidden sm:block">
              <div className="flex items-center gap-2">
                <span
                  className="
                    text-[18px]
                    font-bold
                    tracking-[-0.03em]
                    text-black
                  "
                >
                  TRIKON
                </span>

                <span
                  className="
                    rounded-[5px]
                    bg-[#eeeeee]
                    px-1.5
                    py-[3px]
                    text-[7px]
                    font-bold
                    tracking-[0.13em]
                    text-[#555]
                  "
                >
                  ERP
                </span>
              </div>

              <p
                className="
                  mt-1
                  text-[8px]
                  font-medium
                  uppercase
                  tracking-[0.16em]
                  text-[#777]
                "
              >
                Business Management
              </p>
            </div>
          </div>

          {/* =================================================
              SEARCH
          ================================================== */}
          <div
            className="
              mx-8
              hidden
              min-w-0
              max-w-[500px]
              flex-1
              md:block
              lg:mx-12
            "
          >
            <div className="group relative">
              <Search
                size={18}
                strokeWidth={1.9}
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-[#777]
                "
              />

              <input
                type="text"
                placeholder="Search anything..."
                className="
                  h-[44px]
                  w-full
                  rounded-[13px]
                  border
                  border-[#e6e6e6]
                  bg-white/90
                  pl-11
                  pr-14
                  text-[12px]
                  font-medium
                  text-black
                  outline-none
                  shadow-[0_4px_14px_rgba(0,0,0,0.06)]
                  backdrop-blur-md
                  placeholder:text-[#999]
                  transition-all
                  focus:border-black
                  focus:bg-white
                "
              />

              <span
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  rounded-[7px]
                  border
                  border-[#e3e3e3]
                  bg-[#f7f7f7]
                  px-2
                  py-1
                  text-[9px]
                  font-medium
                  text-[#777]
                "
              >
                ⌘ K
              </span>
            </div>
          </div>

          <div className="flex-1 md:hidden" />

          {/* =================================================
              ACTIONS
          ================================================== */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              title="Search"
              className="
                flex
                h-[40px]
                w-[40px]
                items-center
                justify-center
                rounded-[11px]
                border
                border-[#e5e5e5]
                bg-white/90
                text-black
                shadow-sm
                md:hidden
              "
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              title="Applications"
              className="
                flex
                h-[40px]
                w-[40px]
                items-center
                justify-center
                rounded-[11px]
                border
                border-[#e5e5e5]
                bg-white/90
                text-black
                shadow-sm
                transition-all
                hover:bg-black
                hover:text-white
              "
            >
              <Grid2X2
                size={17}
                strokeWidth={1.8}
              />
            </button>

            <button
              type="button"
              title="Theme"
              className="
                hidden
                h-[40px]
                w-[40px]
                items-center
                justify-center
                rounded-[11px]
                border
                border-[#e5e5e5]
                bg-white/90
                text-black
                shadow-sm
                sm:flex
              "
            >
              <Sun size={18} />
            </button>

            <button
              type="button"
              title="Notifications"
              className="
                relative
                flex
                h-[40px]
                w-[40px]
                items-center
                justify-center
                rounded-[11px]
                border
                border-[#e5e5e5]
                bg-white/90
                text-black
                shadow-sm
              "
            >
              <Bell size={18} />

              <span
                className="
                  absolute
                  right-[5px]
                  top-[5px]
                  flex
                  h-[15px]
                  min-w-[15px]
                  items-center
                  justify-center
                  rounded-full
                  bg-black
                  px-1
                  text-[7px]
                  font-bold
                  text-white
                "
              >
                3
              </span>
            </button>

            <button
              type="button"
              title="Settings"
              className="
                hidden
                h-[40px]
                w-[40px]
                items-center
                justify-center
                rounded-[11px]
                border
                border-[#e5e5e5]
                bg-white/90
                text-black
                shadow-sm
                md:flex
              "
            >
              <Settings size={18} />
            </button>

            <div
              className="
                mx-1
                hidden
                h-7
                w-px
                bg-[#dedede]
                sm:block
              "
            />

            {/* PROFILE */}
            <button
              type="button"
              title="Profile"
              className="
                flex
                items-center
                gap-2
                rounded-[12px]
                border
                border-[#e5e5e5]
                bg-white/90
                py-1
                pl-1
                pr-2
                shadow-sm
              "
            >
              <div
                className="
                  relative
                  flex
                  h-[34px]
                  w-[34px]
                  items-center
                  justify-center
                  rounded-[10px]
                  bg-black
                  text-[12px]
                  font-bold
                  text-white
                "
              >
                A

                <span
                  className="
                    absolute
                    bottom-0
                    right-0
                    h-[8px]
                    w-[8px]
                    rounded-full
                    border-2
                    border-white
                    bg-[#777]
                  "
                />
              </div>

              <div className="hidden text-left leading-none lg:block">
                <p className="text-[11px] font-bold text-black">
                  Admin User
                </p>

                <p className="mt-1 text-[8px] text-[#777]">
                  Administrator
                </p>
              </div>

              <ChevronDown
                size={14}
                className="
                  hidden
                  text-[#555]
                  lg:block
                "
              />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          FLOATING MENU ISLAND
      ====================================================== */}
      <div
        className="
          relative
          z-[99999]
          flex
          justify-center
          overflow-visible
          px-3
        "
      >
        <div
          className="
            relative
            z-[99999]
            -mt-[1px]
            overflow-visible
          "
        >
          <ModuleNav />
        </div>
      </div>
    </header>
  );
}