package jp.base.saikobeat;

import java.io.File;
import java.io.IOException;
import java.util.function.Consumer;

/** Release build has NO YouTube extractor, audio download, or GPL dependency. */
final class DebugYoutubeExtractor {
  private DebugYoutubeExtractor(){}
  static void initialize(){}
  static void loadAudio(String id,File out,Consumer<String> progress)throws IOException{
    throw new IOException("YouTube音声解析は正式許諾がないため配布版では利用できません");
  }
}
