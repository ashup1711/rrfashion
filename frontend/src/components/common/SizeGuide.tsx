import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SizeGuideProps {
  isOpen: boolean;
  onClose: () => void;
  category?: 'women' | 'men' | 'kids' | 'accessories' | 'kurti' | 'blouse' | 'gown' | 'lehenga';
}

interface SizeRow {
  size: string;
  bust: string;
  waist: string;
  hips: string;
  kurtiLength: string;
  blouseLength: string;
}

const SIZE_CHARTS: Record<string, SizeRow[]> = {
  women: [
    { size: 'XS', bust: '32"', waist: '26"', hips: '35"', kurtiLength: '44"', blouseLength: '14"' },
    { size: 'S', bust: '34"', waist: '28"', hips: '37"', kurtiLength: '45"', blouseLength: '14.5"' },
    { size: 'M', bust: '36"', waist: '30"', hips: '39"', kurtiLength: '46"', blouseLength: '15"' },
    { size: 'L', bust: '38"', waist: '32"', hips: '41"', kurtiLength: '47"', blouseLength: '15.5"' },
    { size: 'XL', bust: '40"', waist: '34"', hips: '43"', kurtiLength: '48"', blouseLength: '16"' },
    { size: 'XXL', bust: '42"', waist: '36"', hips: '45"', kurtiLength: '49"', blouseLength: '16.5"' },
  ],
  kurti: [
    { size: 'XS', bust: '32"', waist: '26"', hips: '35"', kurtiLength: '44"', blouseLength: '14"' },
    { size: 'S', bust: '34"', waist: '28"', hips: '37"', kurtiLength: '45"', blouseLength: '14.5"' },
    { size: 'M', bust: '36"', waist: '30"', hips: '39"', kurtiLength: '46"', blouseLength: '15"' },
    { size: 'L', bust: '38"', waist: '32"', hips: '41"', kurtiLength: '47"', blouseLength: '15.5"' },
    { size: 'XL', bust: '40"', waist: '34"', hips: '43"', kurtiLength: '48"', blouseLength: '16"' },
    { size: 'XXL', bust: '42"', waist: '36"', hips: '45"', kurtiLength: '49"', blouseLength: '16.5"' },
  ],
  blouse: [
    { size: 'XS', bust: '32"', waist: '26"', hips: '35"', kurtiLength: '44"', blouseLength: '14"' },
    { size: 'S', bust: '34"', waist: '28"', hips: '37"', kurtiLength: '45"', blouseLength: '14.5"' },
    { size: 'M', bust: '36"', waist: '30"', hips: '39"', kurtiLength: '46"', blouseLength: '15"' },
    { size: 'L', bust: '38"', waist: '32"', hips: '41"', kurtiLength: '47"', blouseLength: '15.5"' },
    { size: 'XL', bust: '40"', waist: '34"', hips: '43"', kurtiLength: '48"', blouseLength: '16"' },
    { size: 'XXL', bust: '42"', waist: '36"', hips: '45"', kurtiLength: '49"', blouseLength: '16.5"' },
  ],
  gown: [
    { size: 'XS', bust: '32"', waist: '26"', hips: '35"', kurtiLength: '44"', blouseLength: '14"' },
    { size: 'S', bust: '34"', waist: '28"', hips: '37"', kurtiLength: '45"', blouseLength: '14.5"' },
    { size: 'M', bust: '36"', waist: '30"', hips: '39"', kurtiLength: '46"', blouseLength: '15"' },
    { size: 'L', bust: '38"', waist: '32"', hips: '41"', kurtiLength: '47"', blouseLength: '15.5"' },
    { size: 'XL', bust: '40"', waist: '34"', hips: '43"', kurtiLength: '48"', blouseLength: '16"' },
    { size: 'XXL', bust: '42"', waist: '36"', hips: '45"', kurtiLength: '49"', blouseLength: '16.5"' },
  ],
  lehenga: [
    { size: 'XS', bust: '32"', waist: '26"', hips: '35"', kurtiLength: '44"', blouseLength: '14"' },
    { size: 'S', bust: '34"', waist: '28"', hips: '37"', kurtiLength: '45"', blouseLength: '14.5"' },
    { size: 'M', bust: '36"', waist: '30"', hips: '39"', kurtiLength: '46"', blouseLength: '15"' },
    { size: 'L', bust: '38"', waist: '32"', hips: '41"', kurtiLength: '47"', blouseLength: '15.5"' },
    { size: 'XL', bust: '40"', waist: '34"', hips: '43"', kurtiLength: '48"', blouseLength: '16"' },
    { size: 'XXL', bust: '42"', waist: '36"', hips: '45"', kurtiLength: '49"', blouseLength: '16.5"' },
  ],
  men: [
    { size: 'S', bust: '36"', waist: '30"', hips: '36"', kurtiLength: '28"', blouseLength: '28"' },
    { size: 'M', bust: '38"', waist: '32"', hips: '38"', kurtiLength: '29"', blouseLength: '29"' },
    { size: 'L', bust: '40"', waist: '34"', hips: '40"', kurtiLength: '30"', blouseLength: '30"' },
    { size: 'XL', bust: '42"', waist: '36"', hips: '42"', kurtiLength: '31"', blouseLength: '31"' },
    { size: 'XXL', bust: '44"', waist: '38"', hips: '44"', kurtiLength: '32"', blouseLength: '32"' },
  ],
  kids: [
    { size: '2-3Y', bust: '21"', waist: '20"', hips: '22"', kurtiLength: '20"', blouseLength: '12"' },
    { size: '4-5Y', bust: '23"', waist: '21"', hips: '24"', kurtiLength: '22"', blouseLength: '12.5"' },
    { size: '6-7Y', bust: '25"', waist: '22"', hips: '26"', kurtiLength: '24"', blouseLength: '13"' },
    { size: '8-9Y', bust: '27"', waist: '23"', hips: '28"', kurtiLength: '26"', blouseLength: '13.5"' },
    { size: '10-11Y', bust: '29"', waist: '24"', hips: '30"', kurtiLength: '28"', blouseLength: '14"' },
  ],
  accessories: [
    { size: 'One Size', bust: '-', waist: '-', hips: '-', kurtiLength: '-', blouseLength: '-' },
  ],
};

const MEASUREMENT_GUIDE = [
  {
    title: 'Bust',
    description: 'Measure around the fullest part of your chest, keeping the tape horizontal.',
  },
  {
    title: 'Waist',
    description: 'Measure around your natural waistline, the narrowest part of your torso.',
  },
  {
    title: 'Hips',
    description: 'Measure around the fullest part of your hips, about 8" below your waistline.',
  },
  {
    title: 'Kurti Length',
    description: 'Measure from the highest point of your shoulder down to where you want the kurti to end.',
  },
  {
    title: 'Blouse Length',
    description: 'Measure from the shoulder seam down to the desired blouse hem.',
  },
];

const SizeGuide = ({ isOpen, onClose, category = 'women' }: SizeGuideProps) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'measure'>('chart');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const convertToCm = (val: string) => {
    if (unit === 'in' || !val.includes('"')) return val;
    return val.replace(/(\d+(?:\.\d+)?)"/g, (_match, num) => `${(parseFloat(num) * 2.54).toFixed(1)} cm`);
  };

  const chart = SIZE_CHARTS[category] || SIZE_CHARTS.women;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-medium">
              <h3 className="text-section-title font-display text-primary-900">Size Guide</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-light rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex border-b border-neutral-medium">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'chart'
                    ? 'text-primary-900 border-b-2 border-primary-900'
                    : 'text-neutral-dark hover:text-primary-900'
                }`}
              >
                Size Chart
              </button>
              <button
                onClick={() => setActiveTab('measure')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'measure'
                    ? 'text-primary-900 border-b-2 border-primary-900'
                    : 'text-neutral-dark hover:text-primary-900'
                }`}
              >
                How to Measure
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'chart' ? (
                <div>
                  <div className="flex justify-end mb-4">
                    <div className="inline-flex bg-neutral-light rounded-full p-1">
                      <button
                        onClick={() => setUnit('in')}
                        className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors ${
                          unit === 'in'
                            ? 'bg-white text-primary-900 shadow-sm'
                            : 'text-neutral-dark'
                        }`}
                      >
                        IN
                      </button>
                      <button
                        onClick={() => setUnit('cm')}
                        className={`px-4 py-1 text-xs font-semibold rounded-full transition-colors ${
                          unit === 'cm'
                            ? 'bg-white text-primary-900 shadow-sm'
                            : 'text-neutral-dark'
                        }`}
                      >
                        CM
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary-50 text-primary-900">
                        <th className="py-3 px-4 text-left font-semibold">Size</th>
                        <th className="py-3 px-4 text-left font-semibold">Bust</th>
                        <th className="py-3 px-4 text-left font-semibold">Waist</th>
                        <th className="py-3 px-4 text-left font-semibold">Hips</th>
                        <th className="py-3 px-4 text-left font-semibold">Kurti Length</th>
                        <th className="py-3 px-4 text-left font-semibold">Blouse Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.map((row) => (
                        <tr
                          key={row.size}
                          className="border-b border-neutral-medium last:border-0 hover:bg-neutral-light/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-primary-900">{row.size}</td>
                          <td className="py-3 px-4 text-neutral-nearBlack">
                            {unit === 'in' ? row.bust : convertToCm(row.bust)}
                          </td>
                          <td className="py-3 px-4 text-neutral-nearBlack">
                            {unit === 'in' ? row.waist : convertToCm(row.waist)}
                          </td>
                          <td className="py-3 px-4 text-neutral-nearBlack">
                            {unit === 'in' ? row.hips : convertToCm(row.hips)}
                          </td>
                          <td className="py-3 px-4 text-neutral-nearBlack">
                            {unit === 'in' ? row.kurtiLength : convertToCm(row.kurtiLength)}
                          </td>
                          <td className="py-3 px-4 text-neutral-nearBlack">
                            {unit === 'in' ? row.blouseLength : convertToCm(row.blouseLength)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-caption text-neutral-dark mt-4 italic">
                    *Measurements are body measurements, not garment measurements.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-section-subtitle font-semibold text-primary-900 mb-4">
                      Measurement Guide
                    </h4>
                    <div className="space-y-4">
                      {MEASUREMENT_GUIDE.map((item) => (
                        <div
                          key={item.title}
                          className="border-l-4 border-primary-500 pl-4 py-2"
                        >
                          <h5 className="font-semibold text-primary-900 mb-1">{item.title}</h5>
                          <p className="text-body-small text-neutral-dark">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="text-section-subtitle font-semibold text-primary-900 mb-3">
                      Find Your Size
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-caption font-medium text-neutral-dark mb-1">
                          Height ({unit === 'in' ? 'in' : 'cm'})
                        </label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={unit === 'in' ? '65' : '165'}
                        />
                      </div>
                      <div>
                        <label className="block text-caption font-medium text-neutral-dark mb-1">
                          Weight ({unit === 'in' ? 'lb' : 'kg'})
                        </label>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={unit === 'in' ? '140' : '65'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-medium bg-neutral-cream">
              <p className="text-caption text-neutral-dark text-center">
                Need more help?{' '}
                <a
                  href="/contact"
                  className="text-primary-600 font-semibold hover:underline"
                >
                  Contact our support team
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SizeGuide;
