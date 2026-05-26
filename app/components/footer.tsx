import { Plane } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-black text-white py-16">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Plane className="size-5" />
                            <span className="font-light text-base tracking-wider">
                                VOYAGE
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm font-light leading-relaxed">
                            探索世界，創造美好回憶
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-6 text-sm tracking-wider font-light">
                            熱門目的地
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-400 font-light">
                            <li className="hover:text-white transition-colors cursor-pointer">
                                日本
                            </li>
                            <li className="hover:text-white transition-colors cursor-pointer">
                                歐洲
                            </li>
                            <li className="hover:text-white transition-colors cursor-pointer">
                                東南亞
                            </li>
                            <li className="hover:text-white transition-colors cursor-pointer">
                                美洲
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-6 text-sm tracking-wider font-light">
                            服務
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-400 font-light">
                            <li className="hover:text-white transition-colors cursor-pointer">
                                行程規劃
                            </li>
                            <li className="hover:text-white transition-colors cursor-pointer">
                                訂房服務
                            </li>
                            <li className="hover:text-white transition-colors cursor-pointer">
                                機票預訂
                            </li>
                            <li className="hover:text-white transition-colors cursor-pointer">
                                旅遊保險
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-6 text-sm tracking-wider font-light">
                            聯絡我們
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-400 font-light">
                            <li>0800-123-456</li>
                            <li>service@voyage.com</li>
                            <li>週一至週五 9:00-18:00</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500 tracking-wider font-light">
                    © 2026 VOYAGE. ALL RIGHTS RESERVED.
                </div>
            </div>
        </footer>
    );
}
