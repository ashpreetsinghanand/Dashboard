import { useNavigate } from 'react-router-dom'
import { AuthScreen } from '../components/AuthScreen'

const languages = [
  { label: 'हिन्दी', glyph: 'अ', bg: '#daeaf9', color: '#468bc7', radius: 'rounded-[15px]' },
  { label: 'English', glyph: 'A', bg: '#dbf1dc', color: '#54b554' },
  { label: 'Bengali-বাংলা', glyph: 'ক', bg: '#d5f0e5', color: '#31a977' },
  { label: 'Telugu-తెలుగు', glyph: 'అ', bg: '#f8dcd3', color: '#d3542c' },
  { label: 'Tamil-বাংলা', glyph: 'அ', bg: '#fdf3d2', color: '#eac02c' },
  { label: 'Marathi-मराठी', glyph: 'अ', bg: '#d6f1f3', color: '#32babf' },
  { label: 'Gujarati-ગુજરાતી', glyph: 'અ', bg: '#e5dcda', color: '#6a4141' },
  { label: 'Kannada-ಕನ್ನಡ', glyph: 'ಎ', bg: '#e8d1fd', color: '#8d21e7' },
  { label: 'Malayalam-മലയാളം', glyph: 'എ', bg: '#fbebe3', color: '#e29276' },
  { label: 'Punjabi-ਪੰਜਾਬੀ', glyph: 'Punjabi', bg: '#ffd3d5', color: '#1e1e1e', labelColor: '#8d21e7' },
]

function LanguageCard({
  language,
  onChoose,
}: {
  language: (typeof languages)[number]
  onChoose: (label: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChoose(language.label)}
      className={`relative h-[130px] w-[184px] text-center ${language.radius ?? 'rounded-[12px]'}`}
      style={{ background: language.bg, color: language.color }}
    >
      <span
        className="absolute top-[10px] left-[10px] text-[12px] font-medium"
        style={{ color: language.labelColor ?? language.color, fontFamily: 'Poppins, sans-serif' }}
      >
        {language.label}
      </span>
      <span
        className={`absolute inset-x-0 font-medium ${
          language.glyph === 'Punjabi' ? 'top-[53px] text-[16px]' : 'top-[18px] text-[60px] leading-none'
        }`}
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {language.glyph}
      </span>
    </button>
  )
}

export function LanguagePage() {
  const navigate = useNavigate()

  function choose(label: string) {
    sessionStorage.setItem('krsi-language', label)
    navigate('/signup/category')
  }

  return (
    <AuthScreen
      filled={1}
      title="Choose Your Language"
      subtitle="Select your prefeed language to continue"
    >
      <div className="mt-[30px] flex w-[811px] flex-col gap-[25px]">
        <div className="grid grid-cols-4 gap-[25px]">
          {languages.slice(0, 8).map((language) => (
            <LanguageCard key={language.label} language={language} onChoose={choose} />
          ))}
        </div>
        <div className="flex justify-center gap-[25px]">
          {languages.slice(8).map((language) => (
            <LanguageCard key={language.label} language={language} onChoose={choose} />
          ))}
        </div>
      </div>
    </AuthScreen>
  )
}
