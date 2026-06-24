import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PomodoroTimer from "@pages/PomodoroTimer.tsx";
import RegexTester from "@pages/RegexTester.tsx";
import LoremIpsumGenerator from "@pages/LoremIpsumGenerator.tsx";
import ColorConverter from "@pages/ColorConverter.tsx";
import UUIDGenerator from "@pages/UUIDGenerator.tsx";
import QrCodeGenerator from "@pages/QrCodeGenerator.tsx";
import BpmTapCounter from "@pages/BpmTapCounter.tsx";
import CamelotWheel from "@pages/CamelotWheel.tsx";
import BpmDelayCalculator from "@pages/BpmDelayCalculator.tsx";
import FrequencyCalculator from "@pages/FrequencyCalculator.tsx";
import Seo from "@components/Seo";

export default function Tools() {
    const { hash } = useLocation();

    // Scroll to a tool's section when arriving via an old /tools/<name> link
    useEffect(() => {
        if (!hash) return;
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }, [hash]);

    return (
        <div className="page">
            <Seo
                title="Web Tools"
                description="A small collection of utilities — QR generator, color converter, regex tester, UUID, BPM tools, a Camelot wheel for DJs, an antenna/RF calculator, and more."
                path="/tools"
            />
            <h1 className="mb-2 text-3xl font-bold text-primary">Web Tools</h1>
            <p className="mb-6 text-muted-foreground">
                A small collection of utilities I use, all in one place.
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section id="pomodoro" className="h-full">
                    <PomodoroTimer />
                </section>
                <section id="regex" className="h-full">
                    <RegexTester />
                </section>
                <section id="colorconverter" className="h-full">
                    <ColorConverter />
                </section>
                <section id="uuidgenerator" className="h-full">
                    <UUIDGenerator />
                </section>
                <section id="qrcode" className="h-full lg:col-span-2">
                    <QrCodeGenerator />
                </section>
                <section id="bpmtap" className="h-full">
                    <BpmTapCounter />
                </section>
                <section id="camelot" className="h-full">
                    <CamelotWheel />
                </section>
                <section id="bpmdelay" className="h-full">
                    <BpmDelayCalculator />
                </section>
                <section id="frequency" className="h-full">
                    <FrequencyCalculator />
                </section>
                <section id="loremipsum" className="lg:col-span-2">
                    <LoremIpsumGenerator />
                </section>
            </div>
        </div>
    );
}
