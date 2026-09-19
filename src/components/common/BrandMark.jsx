/*
  BrandMark — the "AI Infrastructure Atlas" product mark, top-left of the
  sidebar. A rendered 3D black chip slab with neon-pink circuit traces and an
  underglow strip (512px PNG, razor-sharp at the 34px nav size).

  Fixed brand colors in both light and dark mode — brand marks don't invert.
*/
import brandMarkUrl from '../../assets/brand-mark.png'

export default function BrandMark({ size = 34 }) {
  return (
    <img
      src={brandMarkUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0 rounded-[9px]"
    />
  )
}
