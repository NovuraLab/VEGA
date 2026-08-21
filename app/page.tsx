import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Sequence from '@/components/Sequence'
import Detail from '@/components/Detail'
import Specification from '@/components/Specification'
import Footer from '@/components/Footer'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Sequence />
        <Detail />
        <Specification />
      </main>
      <Footer />
    </>
  )
}
