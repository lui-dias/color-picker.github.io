import { batch, useComputed, useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import tinycolor from 'tinycolor2'

const FORMATS = ['hex', 'rgb', 'hsl', 'hsv']

export function App() {
    const saturation = useSignal(0)
    const hue = useSignal(0)
    const value = useSignal(1)
    const opacity = useSignal(1)

    const format = useSignal<(typeof FORMATS)[number]>('hex')
    const formattedColor = useComputed(() => {
        const hasAlpha = opacity.value < 1

        if (format.value === 'hex') return hasAlpha ? color.value.toHex8String() : color.value.toHexString()
        if (format.value === 'rgb') return color.value.toRgbString()
        if (format.value === 'hsl') return color.value.toHslString()
        if (format.value === 'hsv') return color.value.toHsvString()

        throw new Error(`Invalid format: ${format.value}`)
    })

    const color = useComputed(() => {
        console.log({ h: hue.value, s: saturation.value, v: value.value, a: opacity.value })

        return tinycolor.fromRatio({
            h: hue.value,
            s: saturation.value,
            v: value.value,
            a: opacity.value,
        })
    })

    const currentColorIsDark = useComputed(() => color.value.isDark())

    useEffect(() => {
        const picker = document.getElementById('picker') as HTMLDivElement
        const hueEl = document.getElementById('hue') as HTMLDivElement
        const opacityEl = document.getElementById('opacity') as HTMLDivElement
        const pickerCursor = document.getElementById('picker-cursor') as HTMLDivElement
        const hueCursor = document.getElementById('hue-cursor') as HTMLDivElement
        const opacityCursor = document.getElementById('opacity-cursor') as HTMLDivElement

        const eyeDropper = document.getElementById('eyedropper') as HTMLButtonElement

        const clamp = (min: number, value: number, max: number) => Math.max(min, Math.min(value, max))

        let canUpdatePicker = false
        let canUpdateHue = false
        let canUpdateOpacity = false

        // @ts-ignore
        if (window.EyeDropper) {
            eyeDropper.addEventListener('click', async () => {
                // @ts-ignore
                const eyeDropper = new window.EyeDropper()
                try {
                    const hex = (await eyeDropper.open()).sRGBHex
                    const color = tinycolor(hex)

                    batch(() => {
                        const { h, s, v, a } = color.toHsv()

                        batch(() => {
                            setHue(h / 360)
                            setSaturationAndValue(s, 1 - v)
                            setOpacity(a)
                        })
                    })
                } catch {}
            })

            eyeDropper.classList.replace('hidden', 'flex')
        }

        function setSaturationAndValue(_saturation: number, _value: number) {
            const { width, height } = picker.getBoundingClientRect()

            const maxX = width
            const maxY = height

            const x = _saturation * width
            const y = _value * height

            batch(() => {
                saturation.value = clamp(0, _saturation, 1)
                value.value = clamp(0, 1 - _value, 1)
            })

            pickerCursor.style.transform = `translate(calc(-50% + ${clamp(0, x, maxX)}px), calc(-50% + ${clamp(0, y, maxY)}px))`
            pickerCursor.style.borderColor = currentColorIsDark.value ? 'white' : 'black'
        }

        function setHue(_hue: number) {
            const { width } = hueEl.getBoundingClientRect()

            const x = _hue * width

            hue.value = clamp(0, _hue, 1)
            hueCursor.style.transform = `translateX(${clamp(0, x, width - 8)}px)`
        }

        function setOpacity(_opacity: number) {
            const { width } = opacityEl.getBoundingClientRect()

            const x = _opacity * width

            opacity.value = clamp(0, _opacity, 1)
            opacityCursor.style.transform = `translateX(${clamp(0, x, width - 8)}px)`
        }

        function updatePicker(e: MouseEvent) {
            const { width, height, left, top } = picker.getBoundingClientRect()

            const normalizedX = (e.clientX - left) / width
            const normalizedY = (e.clientY - top) / height
            setSaturationAndValue(normalizedX, normalizedY)
        }

        function updateHue(e: MouseEvent) {
            const { width, left } = hueEl.getBoundingClientRect()

            const normalizedX = (e.clientX - left) / width
            setHue(normalizedX)
        }

        function updateOpacity(e: MouseEvent) {
            const { width, left } = opacityEl.getBoundingClientRect()

            const normalizedX = (e.clientX - left) / width
            setOpacity(normalizedX)
        }

        // @ts-ignore -
        addEventListener('setOpacity', (e: CustomEvent) => setOpacity(e.detail))

        addEventListener('mousemove', e => {
            if (canUpdatePicker) updatePicker(e)
            if (canUpdateHue) updateHue(e)
            if (canUpdateOpacity) updateOpacity(e)
        })

        picker.addEventListener('focus', () => (canUpdatePicker = true))
        hueEl.addEventListener('focus', () => (canUpdateHue = true))
        opacityEl.addEventListener('focus', () => (canUpdateOpacity = true))

        picker.addEventListener('blur', () => (canUpdatePicker = false))
        hueEl.addEventListener('blur', () => (canUpdateHue = false))
        opacityEl.addEventListener('blur', () => (canUpdateOpacity = false))

        addEventListener('mouseup', () => {
            canUpdatePicker = false
            canUpdateHue = false
            canUpdateOpacity = false
        })

        picker.addEventListener('mousedown', e => {
            canUpdatePicker = true

            updatePicker(e)
        })

        hueEl.addEventListener('mousedown', e => {
            canUpdateHue = true
            updateHue(e)
        })

        opacityEl.addEventListener('mousedown', e => {
            canUpdateOpacity = true
            updateOpacity(e)
        })

        setOpacity(1)
        setSaturationAndValue(0.5, 0.5)

        pickerCursor.classList.remove('opacity-0')
        hueCursor.classList.remove('opacity-0')
        opacityCursor.classList.remove('opacity-0')
    }, [])

    return (
        <div class='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-xl flex flex-col gap-4 bg-white shadow-xl'>
            {/* Picker */}
            <div
                id='picker'
                class='relative rounded-xl shadow-md'
                style={{ background: tinycolor.fromRatio({ h: hue.value, s: 1, v: 0.5, a: 1 }).toHexString() }}
            >
                <div class='bg-gradient-to-r from-white rounded-xl'>
                    <div class='h-[250px] relative bg-gradient-to-t from-black rounded-xl' />
                    <div
                        id='picker-cursor'
                        class='absolute inset-0 -translate-x-1/2 -translate-y-1/2 border size-4 rounded-full pointer-events-none transition-colors duration-300 opacity-0'
                    />
                </div>
            </div>

            {/* Eyedropper */}
            <div class='flex items-center gap-4'>
                <button
                    type='button'
                    id='eyedropper'
                    class='size-10 items-center justify-center rounded-full shadow-[2px_2px_6px_1px_rgba(0,0,0,0.2)] hidden shrink-0'
                >
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='24'
                        height='24'
                        viewBox='0 0 24 24'
                        class='text-zinc-700'
                    >
                        <path
                            fill='currentColor'
                            d='m19.35 11.72l-2.13 2.13l-1.41-1.42l-7.71 7.71L3.5 22L2 20.5l1.86-4.6l7.71-7.71l-1.42-1.41l2.13-2.13zM16.76 3A3 3 0 0 1 21 3a3 3 0 0 1 0 4.24l-1.92 1.92l-4.24-4.24zM5.56 17.03L4.5 19.5l2.47-1.06L14.4 11L13 9.6z'
                        />
                    </svg>
                </button>

                <div class='flex flex-col gap-2 w-full'>
                    {/* Hue */}
                    <div
                        class='w-full h-6 relative shadow-lg'
                        id='hue'
                        style={{
                            background:
                                'linear-gradient(to right, rgb(255, 0, 0) 0%, rgb(255, 255, 0) 17%, rgb(0, 255, 0) 33%, rgb(0, 255, 255) 50%, rgb(0, 0, 255) 67%, rgb(255, 0, 255) 83%, rgb(255, 0, 0) 100%)',
                        }}
                    >
                        <div
                            id='hue-cursor'
                            class='w-2 h-full bg-white absolute border border-zinc-500 pointer-events-none opacity-0'
                        />
                    </div>

                    {/* Opacity */}
                    <div id='opacity' class='w-full h-6 relative shadow-lg bg-white'>
                        <div
                            class='absolute inset-0'
                            style={{
                                background:
                                    'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADFJREFUOE9jZGBgEGHAD97gk2YcNYBhmIQBgWSAP52AwoAQwJvQRg1gACckQoC2gQgAIF8IscwEtKYAAAAASUVORK5CYII=)',
                            }}
                        />
                        <div
                            class='absolute inset-0'
                            style={{
                                background: `linear-gradient(to right, ${tinycolor.fromRatio({ h: hue.value, s: saturation.value, v: value.value, a: 0 }).toRgbString()} 0%, ${tinycolor.fromRatio({ h: hue.value, s: saturation.value, v: value.value, a: 1 }).toRgbString()} 100%)`,
                            }}
                        />

                        <div
                            id='opacity-cursor'
                            class='w-2 h-full bg-white absolute inset-0 border border-zinc-500 pointer-events-none opacity-0'
                        />
                    </div>
                </div>
            </div>

            {/* Color preview */}
            <div class='flex items-center gap-2'>
                <div class='size-10 rounded relative bg-white flex items-center gap-4 shrink-0'>
                    <div
                        class='absolute inset-0'
                        style={{
                            background:
                                'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADFJREFUOE9jZGBgEGHAD97gk2YcNYBhmIQBgWSAP52AwoAQwJvQRg1gACckQoC2gQgAIF8IscwEtKYAAAAASUVORK5CYII=)',
                        }}
                    />
                    <div
                        class='absolute inset-0 rounded-xl'
                        style={{
                            backgroundColor: color.value.toRgbString(),
                        }}
                    />
                </div>

                {/* Display color code/opacity */}
                <button
                    type='button'
                    class='flex items-center justify-between border border-zinc-300 px-2 h-10 rounded-xl w-full ml-2'
                >
                    <input
                        type='text'
                        class='text-black outline-0 max-w-44'
                        value={formattedColor.value}
                        spellcheck={false}
                        onChange={e => {
                            let v = e.currentTarget.value

                            const isHex = /[A-z0-9]{3,6,8}/.test(v)

                            if (isHex) v = `#${v.replace('#', '')}`

                            const c = tinycolor(v)

                            if (c.isValid()) {
                                const { h, s, v, a } = c.toHsv()

                                batch(() => {
                                    hue.value = h / 360
                                    saturation.value = s
                                    value.value = 1 - v
                                    opacity.value = a
                                })

                                format.value = c.getFormat()
                            } else {
                                e.currentTarget.value = formattedColor.value
                            }
                        }}
                    />
                    <input
                        type='text'
                        class='text-zinc-500 outline-0 max-w-10'
                        value={`${Math.floor(color.value.toHsv().a * 100)}%`}
                        spellcheck={false}
                        onChange={e => {
                            const v = e.currentTarget.value

                            const converted = Math.floor(Number(v.replace(/\D/g, ''))) / 100
                            const alpha = Math.min(1, Math.max(0, converted))

                            const c = tinycolor.fromRatio({
                                h: hue.value,
                                s: saturation.value,
                                v: value.value,
                                a: alpha,
                            })

                            if (c.isValid()) {
                                opacity.value = alpha
                                e.currentTarget.value = `${Math.floor(alpha * 100)}%`

                                const ev = new CustomEvent('setOpacity', { detail: alpha })
                                dispatchEvent(ev)
                            } else {
                                e.currentTarget.value = `${Math.floor(color.value.toHsv().a * 100)}%`
                            }
                        }}
                    />
                </button>

                {/* Choose color format */}
                <div class='relative'>
                    <input type='checkbox' id='format' class='hidden peer' />

                    <label
                        for='format'
                        class='flex items-center justify-between group gap-1 border border-zinc-300 pl-2 h-10 rounded-xl peer-checked:rounded-b-none transition-all duration-300 w-full text-black cursor-pointer'
                    >
                        <span>{format.value.toUpperCase()}</span>

                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='28'
                            height='28'
                            viewBox='0 0 24 24'
                            class='text-zinc-800 -rotate-90 peer-checked:group-[]:rotate-90 transition-transform'
                        >
                            <path
                                fill='currentColor'
                                d='m10.8 12l3.9 3.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.212-.325T8.425 12t.063-.375t.212-.325l4.6-4.6q.275-.275.7-.275t.7.275t.275.7t-.275.7z'
                            />
                        </svg>
                    </label>

                    <div class='absolute grid grid-rows-[0fr] transition-all peer-checked:grid-rows-[1fr] bg-white w-full rounded-b-xl shadow-lg'>
                        <div class='overflow-hidden flex flex-col divide-y divide-zinc-300'>
                            {FORMATS.map(f => (
                                <button
                                    type='button'
                                    class={`text-center h-10 text-black w-full hover:bg-zinc-400 hover:font-medium transition-all ${f === format.value ? 'bg-zinc-200' : ''}`}
                                    onClick={() => {
                                        format.value = f

                                        const input = document.getElementById('format') as HTMLInputElement

                                        input.checked = false
                                    }}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
